"use server";

import { prisma } from "@/shared/db/prisma";
import { getNextSequenceNumber } from "./sequence.service";
import { getTenantId } from "@/lib/auth";

export async function getCreditNotes() {
  const tenantId = await getTenantId();
  return await prisma.creditNote.findMany({
    where: { tenantId },
    include: {
      company: true,
      invoice: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Generates an immutable Credit Note (Facture d'Avoir) linked to a finalized invoice.
 * Reverses AR and Revenue by posting a balancing General Ledger Entry:
 * Debit 7111 (Ventes de marchandises) = Subtotal HT
 * Debit 4455 (État TVA facturée) = TVA Amount
 * Credit 3421 (Clients) = Total TTC
 * If restock is true, increments warehouse inventory via StockMovement (IN).
 */
export async function createCreditNoteFromInvoice(data: {
  invoiceId: string;
  reason: string;
  restockGoods?: boolean;
}) {
  const tenantId = await getTenantId();
  const year = new Date().getFullYear();
  const number = await getNextSequenceNumber(tenantId, "CreditNote", year);

  return await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUnique({
      where: { id: data.invoiceId, tenantId },
      include: {
        company: true,
        salesOrder: {
          include: {
            devis: { include: { lines: true } },
          },
        },
      },
    });

    if (!invoice) throw new Error("Invoice not found");

    const creditNote = await tx.creditNote.create({
      data: {
        tenantId,
        number,
        invoiceId: invoice.id,
        companyId: invoice.companyId,
        reason: data.reason || "Retour de marchandise / Correction",
        subtotal: invoice.subtotal,
        tvaAmount: invoice.tvaAmount,
        total: invoice.total,
        status: "Finalized",
      },
    });

    // Ensure Moroccan standard accounts exist
    const [acc7111, acc4455, acc3421] = await Promise.all([
      tx.account.upsert({
        where: { tenantId_code: { tenantId, code: "7111" } },
        update: {},
        create: { tenantId, code: "7111", name: "Ventes de marchandises", type: "Revenue" },
      }),
      tx.account.upsert({
        where: { tenantId_code: { tenantId, code: "4455" } },
        update: {},
        create: { tenantId, code: "4455", name: "État - TVA facturée", type: "Liability" },
      }),
      tx.account.upsert({
        where: { tenantId_code: { tenantId, code: "3421" } },
        update: {},
        create: { tenantId, code: "3421", name: "Clients", type: "Asset" },
      }),
    ]);

    // Post reversal Journal Entry to General Ledger
    const journalNumber = await getNextSequenceNumber(tenantId, "JournalEntry", year);
    await tx.journalEntry.create({
      data: {
        tenantId,
        number: journalNumber,
        description: `Avoir ${number} sur Facture ${invoice.number} - ${invoice.company.name}`,
        sourceType: "CreditNote",
        sourceId: creditNote.id,
        status: "Posted",
        lines: {
          create: [
            {
              tenantId,
              accountId: acc7111.id,
              debit: invoice.subtotal,
              credit: 0,
              description: `Annulation Vente HT - Avoir ${number}`,
            },
            {
              tenantId,
              accountId: acc4455.id,
              debit: invoice.tvaAmount,
              credit: 0,
              description: `Régularisation TVA facturée - Avoir ${number}`,
            },
            {
              tenantId,
              accountId: acc3421.id,
              debit: 0,
              credit: invoice.total,
              description: `Annulation Créance Client TTC - ${invoice.company.name}`,
            },
          ],
        },
      },
    });

    // Optionally Restock Inventory
    if (data.restockGoods && invoice.salesOrder?.devis?.lines) {
      const targetWarehouse = await tx.warehouse.findFirst({ where: { tenantId } });
      if (targetWarehouse) {
        for (const line of invoice.salesOrder.devis.lines) {
          await tx.stockMovement.create({
            data: {
              tenantId,
              productId: line.productId,
              warehouseId: targetWarehouse.id,
              quantity: Math.abs(line.quantity), // Positive for IN
              reason: "CustomerReturn",
              sourceDocumentType: "CreditNote",
              sourceDocumentId: creditNote.id,
              note: `Réintégration stock Avoir ${number} (Facture ${invoice.number})`,
            },
          });

          await tx.stockLevel.upsert({
            where: {
              productId_warehouseId: {
                productId: line.productId,
                warehouseId: targetWarehouse.id,
              },
            },
            update: {
              quantity: { increment: line.quantity },
            },
            create: {
              tenantId,
              productId: line.productId,
              warehouseId: targetWarehouse.id,
              quantity: line.quantity,
            },
          });
        }
      }
    }

    return creditNote;
  });
}
