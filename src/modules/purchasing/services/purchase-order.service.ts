"use server";

import { prisma } from "@/shared/db/prisma";
import { getNextSequenceNumber } from "@/modules/sales/services/sequence.service";
import { getTenantId } from "@/lib/auth";

export async function getPurchaseOrders() {
  const tenantId = await getTenantId();
  return await prisma.purchaseOrder.findMany({
    where: { tenantId },
    include: {
      company: true,
      lines: { include: { product: true } },
      receipts: true,
      bills: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getPurchaseOrder(id: string) {
  const tenantId = await getTenantId();
  return await prisma.purchaseOrder.findUnique({
    where: { id, tenantId },
    include: {
      company: true,
      lines: { include: { product: true } },
      receipts: true,
      bills: true,
    },
  });
}

export async function createPurchaseOrder(data: {
  companyId: string;
  expectedDate?: Date;
  lines: Array<{
    productId: string;
    description: string;
    quantity: number;
    unitPrice: number;
    tvaRate: number;
  }>;
}) {
  const tenantId = await getTenantId();
  const year = new Date().getFullYear();
  const number = await getNextSequenceNumber(tenantId, "PurchaseOrder", year);

  return await prisma.$transaction(async (tx) => {
    let subtotal = 0;
    let tvaAmount = 0;

    const orderLines = data.lines.map((line) => {
      const qty = Number(line.quantity) || 1;
      const price = Number(line.unitPrice) || 0;
      const tvaRate = Number(line.tvaRate ?? 20);
      const lineTotal = qty * price;
      const lineTva = lineTotal * (tvaRate / 100);

      subtotal += lineTotal;
      tvaAmount += lineTva;

      return {
        tenantId,
        productId: line.productId,
        description: line.description || "Article",
        quantity: qty,
        unitPrice: price,
        tvaRate,
        lineTotal,
      };
    });

    const total = subtotal + tvaAmount;

    return await tx.purchaseOrder.create({
      data: {
        tenantId,
        number,
        companyId: data.companyId,
        expectedDate: data.expectedDate,
        subtotal,
        tvaAmount,
        total,
        status: "Draft",
        lines: {
          create: orderLines,
        },
      },
      include: {
        company: true,
        lines: true,
      },
    });
  });
}

export async function confirmPurchaseOrder(id: string) {
  const tenantId = await getTenantId();
  return await prisma.purchaseOrder.update({
    where: { id, tenantId },
    data: { status: "Confirmed" },
  });
}

/**
 * 1-Click Goods Receipt (Bon de Réception) from PO
 * Creates SupplierReceipt, adds StockMovement (IN), and updates StockLevel.
 */
export async function receiveGoodsFromPO(poId: string, warehouseId?: string) {
  const tenantId = await getTenantId();
  const year = new Date().getFullYear();
  const receiptNumber = await getNextSequenceNumber(tenantId, "SupplierReceipt", year);

  return await prisma.$transaction(async (tx) => {
    const po = await tx.purchaseOrder.findUnique({
      where: { id: poId, tenantId },
      include: { lines: true },
    });

    if (!po) throw new Error("Purchase Order not found");

    // Determine target warehouse
    let targetWarehouse = warehouseId
      ? await tx.warehouse.findUnique({ where: { id: warehouseId, tenantId } })
      : await tx.warehouse.findFirst({ where: { tenantId } });

    if (!targetWarehouse) {
      targetWarehouse = await tx.warehouse.create({
        data: {
          tenantId,
          name: "Entrepôt Principal",
          isDefault: true,
          address: "Siège Social, Casablanca",
        },
      });
    }

    // Create SupplierReceipt
    const receipt = await tx.supplierReceipt.create({
      data: {
        tenantId,
        number: receiptNumber,
        purchaseOrderId: po.id,
        warehouseId: targetWarehouse.id,
        status: "Received",
      },
    });

    // Record Stock Movement (IN) and update StockLevel for each line
    for (const line of po.lines) {
      // Create Stock Movement
      await tx.stockMovement.create({
        data: {
          tenantId,
          productId: line.productId,
          warehouseId: targetWarehouse.id,
          quantity: line.quantity, // Positive for IN
          reason: "PurchaseReceipt",
          sourceDocumentType: "SupplierReceipt",
          sourceDocumentId: receipt.id,
          note: `Réception BC ${po.number} - Bon de Réception ${receiptNumber}`,
        },
      });

      // Upsert StockLevel
      await tx.stockLevel.upsert({
        where: {
          productId_warehouseId: {
            productId: line.productId,
            warehouseId: targetWarehouse.id,
          },
        },
        update: {
          quantity: {
            increment: line.quantity,
          },
        },
        create: {
          tenantId,
          productId: line.productId,
          warehouseId: targetWarehouse.id,
          quantity: line.quantity,
        },
      });
    }

    // Update PO status to Received
    await tx.purchaseOrder.update({
      where: { id: poId },
      data: { status: "Received" },
    });

    return receipt;
  });
}

/**
 * 3-Way Match & Supplier Bill Generation
 * Creates SupplierBill and posts balanced Accounts Payable Journal Entry:
 * Debit 6111 (Achats de marchandises) = Subtotal HT
 * Debit 3455 (État TVA récupérable sur charges) = TVA Amount
 * Credit 4411 (Fournisseurs) = Total TTC
 */
export async function createSupplierBillFromPO(poId: string, supplierReference?: string) {
  const tenantId = await getTenantId();
  const year = new Date().getFullYear();
  const billNumber = await getNextSequenceNumber(tenantId, "SupplierBill", year);

  return await prisma.$transaction(async (tx) => {
    const po = await tx.purchaseOrder.findUnique({
      where: { id: poId, tenantId },
      include: { receipts: true, company: true },
    });

    if (!po) throw new Error("Purchase Order not found");

    const receipt = po.receipts[0];

    const bill = await tx.supplierBill.create({
      data: {
        tenantId,
        number: billNumber,
        supplierReference: supplierReference || `INV-${po.number}`,
        companyId: po.companyId,
        purchaseOrderId: po.id,
        supplierReceiptId: receipt ? receipt.id : null,
        subtotal: po.subtotal,
        tvaAmount: po.tvaAmount,
        total: po.total,
        amountDue: po.total,
        amountPaid: 0,
        status: "Posted",
      },
    });

    // Ensure Moroccan standard accounts exist for AP
    const [acc6111, acc3455, acc4411] = await Promise.all([
      tx.account.upsert({
        where: { tenantId_code: { tenantId, code: "6111" } },
        update: {},
        create: {
          tenantId,
          code: "6111",
          name: "Achats de marchandises",
          type: "Expense",
        },
      }),
      tx.account.upsert({
        where: { tenantId_code: { tenantId, code: "3455" } },
        update: {},
        create: {
          tenantId,
          code: "3455",
          name: "État - TVA récupérable sur les charges",
          type: "Asset",
        },
      }),
      tx.account.upsert({
        where: { tenantId_code: { tenantId, code: "4411" } },
        update: {},
        create: {
          tenantId,
          code: "4411",
          name: "Fournisseurs",
          type: "Liability",
        },
      }),
    ]);

    // Create balanced Journal Entry for Accounts Payable
    const journalNumber = await getNextSequenceNumber(tenantId, "JournalEntry", year);
    await tx.journalEntry.create({
      data: {
        tenantId,
        number: journalNumber,
        description: `Facture Fournisseur ${billNumber} - ${po.company.name}`,
        sourceType: "SupplierBill",
        sourceId: bill.id,
        status: "Posted",
        lines: {
          create: [
            {
              tenantId,
              accountId: acc6111.id,
              debit: po.subtotal,
              credit: 0,
              description: `Achats HT - ${po.company.name}`,
            },
            {
              tenantId,
              accountId: acc3455.id,
              debit: po.tvaAmount,
              credit: 0,
              description: `TVA récupérable 20% - ${po.company.name}`,
            },
            {
              tenantId,
              accountId: acc4411.id,
              debit: 0,
              credit: po.total,
              description: `Dette fournisseur TTC - ${po.company.name}`,
            },
          ],
        },
      },
    });

    return bill;
  });
}

/**
 * Retrieves all Supplier Bills for Accounts Payable
 */
export async function getSupplierBills() {
  const tenantId = await getTenantId();
  return await prisma.supplierBill.findMany({
    where: { tenantId },
    include: {
      company: true,
      purchaseOrder: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Settles a Supplier Bill (Disbursement / Règlement Fournisseur)
 * Debit 4411 (Fournisseurs) / Credit 5141 (Banque)
 */
export async function paySupplierBill(data: {
  billId: string;
  amount: number;
  paymentMethod: string;
  reference?: string;
}) {
  const tenantId = await getTenantId();
  const year = new Date().getFullYear();

  return await prisma.$transaction(async (tx) => {
    const bill = await tx.supplierBill.findUnique({
      where: { id: data.billId, tenantId },
      include: { company: true },
    });

    if (!bill) throw new Error("Supplier Bill not found");

    const newAmountPaid = bill.amountPaid + data.amount;
    const newAmountDue = Math.max(0, bill.total - newAmountPaid);
    const newStatus = newAmountDue <= 0.01 ? "Paid" : "Posted";

    const updatedBill = await tx.supplierBill.update({
      where: { id: data.billId },
      data: {
        amountPaid: newAmountPaid,
        amountDue: newAmountDue,
        status: newStatus,
      },
    });

    // Ensure Bank account 5141 and 4411 exist
    const [acc4411, acc5141] = await Promise.all([
      tx.account.upsert({
        where: { tenantId_code: { tenantId, code: "4411" } },
        update: {},
        create: { tenantId, code: "4411", name: "Fournisseurs", type: "Liability" },
      }),
      tx.account.upsert({
        where: { tenantId_code: { tenantId, code: "5141" } },
        update: {},
        create: { tenantId, code: "5141", name: "Banque", type: "Asset" },
      }),
    ]);

    // Post payment journal entry
    const journalNumber = await getNextSequenceNumber(tenantId, "JournalEntry", year);
    await tx.journalEntry.create({
      data: {
        tenantId,
        number: journalNumber,
        description: `Paiement Facture Fournisseur ${bill.number} - ${bill.company.name} (${data.paymentMethod})`,
        sourceType: "Payment",
        sourceId: bill.id,
        status: "Posted",
        lines: {
          create: [
            {
              tenantId,
              accountId: acc4411.id,
              debit: data.amount,
              credit: 0,
              description: `Règlement dette fournisseur - ${bill.company.name}`,
            },
            {
              tenantId,
              accountId: acc5141.id,
              debit: 0,
              credit: data.amount,
              description: `Sortie de trésorerie banque - ${data.paymentMethod}`,
            },
          ],
        },
      },
    });

    return updatedBill;
  });
}
