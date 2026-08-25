"use server";

import { prisma } from "@/shared/db/prisma";
import { getNextSequenceNumber } from "@/modules/sales/services/sequence.service";
import { ensureStandardCOA } from "./coa.service";

export async function postSalesInvoiceToGL(tenantId: string, invoiceId: string, tx: any) {
  // Ensure base accounts exist
  await ensureStandardCOA(tenantId);

  // Fetch the invoice
  const invoice = await tx.invoice.findUnique({
    where: { id: invoiceId, tenantId },
  });

  if (!invoice) throw new Error("Invoice not found for GL posting");

  // Get relevant accounts
  const arAccount = await tx.account.findUnique({ where: { tenantId_code: { tenantId, code: "3421" } } });
  const salesAccount = await tx.account.findUnique({ where: { tenantId_code: { tenantId, code: "7111" } } });
  const tvaAccount = await tx.account.findUnique({ where: { tenantId_code: { tenantId, code: "4455" } } });

  if (!arAccount || !salesAccount || !tvaAccount) {
    throw new Error("Missing standard accounts (3421, 7111, 4455) for sales posting");
  }

  const year = new Date().getFullYear();
  const journalNumber = await getNextSequenceNumber(tenantId, "JournalEntry", year);

  // Create the journal entry
  const je = await tx.journalEntry.create({
    data: {
      tenantId,
      number: journalNumber,
      date: invoice.date,
      description: `Facture client N° ${invoice.number}`,
      status: "Posted",
      sourceType: "Invoice",
      sourceId: invoice.id,
      lines: {
        create: [
          // Debit AR (Total TTC)
          {
            tenantId,
            accountId: arAccount.id,
            debit: invoice.total,
            credit: 0,
            description: `Créance client - Facture ${invoice.number}`,
          },
          // Credit Sales (Total HT)
          {
            tenantId,
            accountId: salesAccount.id,
            debit: 0,
            credit: invoice.subtotal,
            description: `Vente de marchandises - Facture ${invoice.number}`,
          },
          // Credit TVA (TVA Amount)
          {
            tenantId,
            accountId: tvaAccount.id,
            debit: 0,
            credit: invoice.tvaAmount,
            description: `TVA facturée - Facture ${invoice.number}`,
          },
        ],
      },
    },
    include: { lines: true },
  });

  // Verify balance
  const totalDebit = je.lines.reduce((acc: number, line: any) => acc + line.debit, 0);
  const totalCredit = je.lines.reduce((acc: number, line: any) => acc + line.credit, 0);

  // Use a small epsilon for floating point comparison
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error(`Journal Entry is unbalanced! Debit: ${totalDebit}, Credit: ${totalCredit}`);
  }

  return je;
}
