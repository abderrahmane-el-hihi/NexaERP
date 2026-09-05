"use server";

import { Prisma } from "@/generated/prisma/client";
import { withTenant, type Tx } from "@/shared/db/prisma";
import { getTenantId } from "@/lib/auth";
import { dec, roundMoney, serialize } from "@/shared/money";
import { domainError } from "@/shared/errors";
import { nextNumber } from "@/modules/platform/services/sequence.service";
import { audit } from "@/modules/platform/services/audit.service";
import { postEntry } from "@/modules/finance/services/posting.service";
import { computeDocumentTotals, computeLine } from "@/modules/finance/services/tax.service";
import { applyMovement } from "@/modules/inv/services/stock-ledger.service";
import { paySupplierBill as registerSupplierPayment } from "@/modules/finance/services/payment.service";
import { matchBillAgainstReceipts } from "./three-way-match";

/**
 * Procure to pay.
 *
 * PO ──confirm──▶ goods receipt (stock in, 3111 / 4417)
 *                        │
 *                        ▼
 *              vendor bill ──three-way match──▶ posted (4417 + TVA / 4411)
 *                        │
 *                        ▼
 *                    payment (4411 / 5141)
 *
 * The receipt books goods received not invoiced against 4417, and the bill clears it.
 * That intermediate account is what makes a mismatch between what arrived and what was
 * billed visible instead of silently absorbed into the stock value.
 */

export interface POLineInput {
  productId: string;
  description: string;
  quantity: number | string;
  unitPrice: number | string;
  tvaRate?: number | string;
}

export async function getPurchaseOrders() {
  const tenantId = await getTenantId();
  const rows = await withTenant(tenantId, (tx) =>
    tx.purchaseOrder.findMany({
      where: { tenantId },
      include: {
        company: true,
        lines: { include: { product: true } },
        receipts: true,
        bills: true,
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    })
  );
  return serialize(rows);
}

export async function getPurchaseOrder(id: string) {
  const tenantId = await getTenantId();
  const row = await withTenant(tenantId, (tx) =>
    tx.purchaseOrder.findFirst({
      where: { id, tenantId },
      include: {
        company: true,
        lines: { include: { product: true } },
        receipts: true,
        bills: { include: { lines: true } },
      },
    })
  );
  return serialize(row);
}

async function recalcPOTotals(tx: Tx, purchaseOrderId: string) {
  const lines = await tx.purchaseOrderLine.findMany({ where: { purchaseOrderId } });
  const totals = computeDocumentTotals(
    lines.map((l) => ({
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      tvaRate: l.tvaRate,
      lineSubtotal: l.lineSubtotal,
      lineTva: l.lineTva,
    }))
  );
  await tx.purchaseOrder.update({
    where: { id: purchaseOrderId },
    data: {
      subtotal: new Prisma.Decimal(totals.subtotal.toFixed(6)),
      tvaAmount: new Prisma.Decimal(totals.tvaAmount.toFixed(6)),
      total: new Prisma.Decimal(totals.total.toFixed(6)),
    },
  });
  return totals;
}

export async function createPurchaseOrder(data: {
  companyId: string;
  expectedDate?: Date;
  lines: POLineInput[];
}) {
  const tenantId = await getTenantId();
  if (!data.lines?.length) {
    throw domainError("VALIDATION_FAILED", "Une commande d'achat doit comporter au moins une ligne");
  }

  return withTenant(tenantId, async (tx) => {
    const supplier = await tx.company.findFirst({ where: { id: data.companyId, tenantId } });
    if (!supplier) throw domainError("NOT_FOUND", "Fournisseur introuvable");

    const number = await nextNumber(tx, tenantId, "PurchaseOrder");

    const po = await tx.purchaseOrder.create({
      data: {
        tenantId,
        number,
        companyId: data.companyId,
        expectedDate: data.expectedDate ?? null,
        status: "Draft",
        lines: {
          create: data.lines.map((line, index) => {
            const computed = computeLine({
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              tvaRate: line.tvaRate ?? 20,
            });
            return {
              tenantId,
              productId: line.productId,
              description: line.description || "Article",
              quantity: new Prisma.Decimal(dec(line.quantity).toFixed(6)),
              unitPrice: new Prisma.Decimal(dec(line.unitPrice).toFixed(6)),
              tvaRate: new Prisma.Decimal(dec(line.tvaRate ?? 20).toFixed(6)),
              lineSubtotal: new Prisma.Decimal(computed.lineSubtotal.toFixed(6)),
              lineTva: new Prisma.Decimal(computed.lineTva.toFixed(6)),
              lineTotal: new Prisma.Decimal(computed.lineTotal.toFixed(6)),
              position: index,
            };
          }),
        },
      },
    });

    await recalcPOTotals(tx, po.id);
    await audit(tx, { tenantId, entityType: "PurchaseOrder", entityId: po.id, action: "CREATE" });

    return serialize(
      await tx.purchaseOrder.findUniqueOrThrow({
        where: { id: po.id },
        include: { company: true, lines: true },
      })
    );
  });
}

export async function confirmPurchaseOrder(id: string) {
  const tenantId = await getTenantId();

  return withTenant(tenantId, async (tx) => {
    const po = await tx.purchaseOrder.findFirst({ where: { id, tenantId } });
    if (!po) throw domainError("NOT_FOUND", "Commande d'achat introuvable");
    if (po.status !== "Draft" && po.status !== "Sent") {
      throw domainError("INVALID_STATE_TRANSITION", `Commande déjà ${po.status}`);
    }

    const updated = await tx.purchaseOrder.update({
      where: { id },
      data: { status: "Confirmed" },
    });
    await audit(tx, { tenantId, entityType: "PurchaseOrder", entityId: id, action: "UPDATE" });
    return serialize(updated);
  });
}

/** Goods receipt. Stock enters at the PO price and 4417 records what we now owe. */
export async function receiveGoodsFromPO(poId: string, warehouseId?: string) {
  const tenantId = await getTenantId();

  return withTenant(tenantId, async (tx) => {
    const po = await tx.purchaseOrder.findFirst({
      where: { id: poId, tenantId },
      include: { lines: true, company: true },
    });
    if (!po) throw domainError("NOT_FOUND", "Commande d'achat introuvable");
    if (po.status === "Cancelled") {
      throw domainError("INVALID_STATE_TRANSITION", "Commande annulée");
    }

    const warehouse = warehouseId
      ? await tx.warehouse.findFirst({ where: { id: warehouseId, tenantId } })
      : await tx.warehouse.findFirst({ where: { tenantId }, orderBy: { isDefault: "desc" } });
    if (!warehouse) {
      throw domainError("VALIDATION_FAILED", "Aucun entrepôt configuré");
    }

    const pending = po.lines
      .map((l) => ({ line: l, remaining: dec(l.quantity).minus(dec(l.receivedQty)) }))
      .filter((x) => x.remaining.greaterThan(0));

    if (pending.length === 0) {
      throw domainError("INVALID_STATE_TRANSITION", "Commande déjà entièrement réceptionnée");
    }

    const number = await nextNumber(tx, tenantId, "SupplierReceipt");

    const receipt = await tx.supplierReceipt.create({
      data: {
        tenantId,
        number,
        purchaseOrderId: po.id,
        warehouseId: warehouse.id,
        status: "Received",
      },
    });

    for (const { line, remaining } of pending) {
      await applyMovement(tx, {
        tenantId,
        productId: line.productId,
        warehouseId: warehouse.id,
        quantity: remaining,
        unitCost: line.unitPrice,
        reason: "PurchaseReceipt",
        sourceDocumentType: "SupplierReceipt",
        sourceDocumentId: receipt.id,
        note: `Réception ${number} — commande ${po.number} (${po.company.name})`,
      });

      await tx.purchaseOrderLine.update({
        where: { id: line.id },
        data: { receivedQty: new Prisma.Decimal(dec(line.quantity).toFixed(6)) },
      });
    }

    await tx.purchaseOrder.update({ where: { id: po.id }, data: { status: "Received" } });
    await audit(tx, {
      tenantId,
      entityType: "SupplierReceipt",
      entityId: receipt.id,
      action: "POST",
      diff: { number, purchaseOrder: po.number, lines: pending.length },
    });

    return serialize(await tx.supplierReceipt.findUniqueOrThrow({ where: { id: receipt.id } }));
  });
}

export async function createSupplierBillFromPO(
  poId: string,
  supplierReference?: string,
  options: { acceptVariance?: boolean; varianceReason?: string } = {}
) {
  const tenantId = await getTenantId();

  return withTenant(tenantId, async (tx) => {
    const po = await tx.purchaseOrder.findFirst({
      where: { id: poId, tenantId },
      include: { lines: true, company: true, receipts: true },
    });
    if (!po) throw domainError("NOT_FOUND", "Commande d'achat introuvable");

    if (supplierReference) {
      const duplicate = await tx.supplierBill.findFirst({
        where: { tenantId, companyId: po.companyId, supplierReference },
      });
      if (duplicate) {
        throw domainError(
          "DUPLICATE_DOCUMENT",
          `La facture fournisseur ${supplierReference} a déjà été enregistrée (${duplicate.number})`,
          { existingId: duplicate.id }
        );
      }
    }

    const billable = po.lines
      .map((l) => ({ line: l, quantity: dec(l.receivedQty).minus(dec(l.billedQty)) }))
      .filter((x) => x.quantity.greaterThan(0));

    if (billable.length === 0) {
      throw domainError(
        "VALIDATION_FAILED",
        "Rien à facturer: réceptionnez la marchandise avant d'enregistrer la facture fournisseur"
      );
    }

    const exceptions = matchBillAgainstReceipts(
      po.lines,
      billable.map(({ line, quantity }) => ({
        purchaseOrderLineId: line.id,
        description: line.description,
        quantity,
        unitPrice: line.unitPrice,
      }))
    );

    if (exceptions.length > 0 && !options.acceptVariance) {
      throw domainError(
        "VALIDATION_FAILED",
        `Écarts de rapprochement à trois voies: ${exceptions.map((e) => e.detail).join("; ")}`,
        { exceptions }
      );
    }

    const totals = computeDocumentTotals(
      billable.map(({ line, quantity }) => ({
        quantity,
        unitPrice: line.unitPrice,
        tvaRate: line.tvaRate,
      }))
    );

    const number = await nextNumber(tx, tenantId, "SupplierBill");
    const date = new Date();
    const dueDate = new Date(
      date.getTime() + (po.company.defaultPaymentTermsDays ?? 30) * 86_400_000
    );

    const bill = await tx.supplierBill.create({
      data: {
        tenantId,
        number,
        supplierReference: supplierReference ?? null,
        companyId: po.companyId,
        purchaseOrderId: po.id,
        supplierReceiptId: po.receipts[0]?.id ?? null,
        date,
        dueDate,
        status: "Posted",
        postedAt: date,
        subtotal: new Prisma.Decimal(totals.subtotal.toFixed(6)),
        tvaAmount: new Prisma.Decimal(totals.tvaAmount.toFixed(6)),
        total: new Prisma.Decimal(totals.total.toFixed(6)),
        amountDue: new Prisma.Decimal(totals.total.toFixed(6)),
        taxBreakdown: totals.breakdown as never,
        lines: {
          create: billable.map(({ line, quantity }, position) => {
            const computed = computeLine({
              quantity,
              unitPrice: line.unitPrice,
              tvaRate: line.tvaRate,
            });
            return {
              tenantId,
              purchaseOrderLineId: line.id,
              productId: line.productId,
              description: line.description,
              quantity: new Prisma.Decimal(quantity.toFixed(6)),
              unitPrice: line.unitPrice,
              tvaRate: line.tvaRate,
              lineSubtotal: new Prisma.Decimal(computed.lineSubtotal.toFixed(6)),
              lineTva: new Prisma.Decimal(computed.lineTva.toFixed(6)),
              lineTotal: new Prisma.Decimal(computed.lineTotal.toFixed(6)),
              position,
            };
          }),
        },
      },
    });

    // Clear goods-received-not-invoiced, recognise deductible VAT, owe the supplier.
    const entry = await postEntry(tx, {
      tenantId,
      date,
      description: `Facture fournisseur ${number} — ${po.company.name}`,
      journalCode: "ACH",
      sourceType: "SupplierBill",
      sourceId: bill.id,
      lines: [
        { accountCode: "4417", debit: totals.subtotal, description: `Réception facturée — ${number}` },
        ...(totals.tvaAmount.isZero()
          ? []
          : [{ accountCode: "3455", debit: totals.tvaAmount, description: `TVA récupérable — ${number}` }]),
        {
          accountCode: "4411",
          companyId: po.companyId,
          credit: totals.total,
          description: `Dette fournisseur ${po.company.name}`,
        },
      ],
    });

    await tx.supplierBill.update({ where: { id: bill.id }, data: { journalEntryId: entry.id } });

    for (const { line, quantity } of billable) {
      await tx.purchaseOrderLine.update({
        where: { id: line.id },
        data: { billedQty: new Prisma.Decimal(dec(line.billedQty).plus(quantity).toFixed(6)) },
      });
    }

    await tx.purchaseOrder.update({ where: { id: po.id }, data: { status: "Billed" } });

    await audit(tx, {
      tenantId,
      entityType: "SupplierBill",
      entityId: bill.id,
      action: "POST",
      reason: exceptions.length > 0 ? options.varianceReason ?? "Écart accepté" : null,
      diff: { number, total: totals.total.toFixed(2), exceptions },
    });

    return serialize(await tx.supplierBill.findUniqueOrThrow({ where: { id: bill.id } }));
  });
}

export async function getSupplierBills() {
  const tenantId = await getTenantId();
  const rows = await withTenant(tenantId, (tx) =>
    tx.supplierBill.findMany({
      where: { tenantId },
      include: { company: true, purchaseOrder: true, lines: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    })
  );
  return serialize(rows);
}

/**
 * Settles a supplier bill. The money movement and its ledger entry are produced by the
 * payment service, which is the only place a payment is created — the previous version
 * adjusted amountPaid by hand and never touched the ledger, so cash and the books
 * disagreed by construction.
 */
export async function paySupplierBill(data: {
  billId: string;
  amount: number | string;
  method: string;
  reference?: string;
  date?: Date;
}) {
  const amount = roundMoney(data.amount);
  if (amount.lessThanOrEqualTo(0)) {
    throw domainError("VALIDATION_FAILED", "Le montant du règlement doit être positif");
  }

  return registerSupplierPayment(data.billId, {
    amount: amount.toFixed(2),
    method: data.method,
    reference: data.reference,
    date: data.date,
  });
}
