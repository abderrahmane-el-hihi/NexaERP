"use server";

import { Prisma } from "@/generated/prisma/client";
import { withTenant, type Tx } from "@/shared/db/prisma";
import { getTenantId } from "@/lib/auth";
import { dec, roundMoney, serialize, sum } from "@/shared/money";
import { domainError } from "@/shared/errors";
import { nextNumber } from "@/modules/platform/services/sequence.service";
import { audit } from "@/modules/platform/services/audit.service";
import { postEntry, reverseEntry } from "./posting.service";

/**
 * Payments and their allocation to documents.
 *
 * A payment is not "an invoice being paid": it is money moving, which may settle
 * several invoices, part of one, or nothing yet (an advance). PaymentAllocation is the
 * source of truth; `amountPaid` / `amountDue` on the documents are a cache maintained
 * here and nowhere else.
 */

const TREASURY_ACCOUNT: Record<string, string> = {
  cash: "5161",
  espèces: "5161",
  especes: "5161",
  cheque: "5111",
  chèque: "5111",
  virement: "5141",
  carte: "5141",
  effet: "5111",
};

function treasuryAccountFor(method: string): string {
  return TREASURY_ACCOUNT[method.toLowerCase()] ?? "5141";
}

export interface AllocationInput {
  invoiceId?: string;
  supplierBillId?: string;
  amount: number | string;
}

export interface RegisterPaymentInput {
  companyId: string;
  direction?: "INBOUND" | "OUTBOUND";
  amount: number | string;
  method: string;
  date?: Date;
  reference?: string;
  notes?: string;
  allocations?: AllocationInput[];
  userId?: string | null;
}

/** Recomputes a customer invoice's paid/due amounts from its allocations. */
async function refreshInvoiceSettlement(tx: Tx, invoiceId: string) {
  const invoice = await tx.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
  const allocations = await tx.paymentAllocation.findMany({ where: { invoiceId } });
  const paid = sum(allocations.map((a) => a.amount));
  const due = dec(invoice.total).minus(paid);

  await tx.invoice.update({
    where: { id: invoiceId },
    data: {
      amountPaid: new Prisma.Decimal(paid.toFixed(6)),
      amountDue: new Prisma.Decimal(due.toFixed(6)),
      status: due.lessThanOrEqualTo(0) && invoice.status === "Posted" ? "Paid" : invoice.status,
    },
  });
}

async function refreshBillSettlement(tx: Tx, supplierBillId: string) {
  const bill = await tx.supplierBill.findUniqueOrThrow({ where: { id: supplierBillId } });
  const allocations = await tx.paymentAllocation.findMany({ where: { supplierBillId } });
  const paid = sum(allocations.map((a) => a.amount));
  const due = dec(bill.total).minus(paid);

  await tx.supplierBill.update({
    where: { id: supplierBillId },
    data: {
      amountPaid: new Prisma.Decimal(paid.toFixed(6)),
      amountDue: new Prisma.Decimal(due.toFixed(6)),
      status: due.lessThanOrEqualTo(0) && bill.status === "Posted" ? "Paid" : bill.status,
    },
  });
}

export async function registerPayment(input: RegisterPaymentInput) {
  const tenantId = await getTenantId();
  const amount = roundMoney(input.amount);

  if (amount.lessThanOrEqualTo(0)) {
    throw domainError("VALIDATION_FAILED", "Le montant du règlement doit être positif");
  }

  return withTenant(tenantId, async (tx) => {
    const company = await tx.company.findFirst({
      where: { id: input.companyId, tenantId },
      select: { id: true, name: true },
    });
    if (!company) throw domainError("NOT_FOUND", "Tiers introuvable");

    const direction = input.direction ?? "INBOUND";
    const date = input.date ?? new Date();
    const allocations = input.allocations ?? [];

    const allocatedTotal = sum(allocations.map((a) => a.amount));
    if (allocatedTotal.greaterThan(amount)) {
      throw domainError(
        "OVER_ALLOCATION",
        `Les affectations (${allocatedTotal.toFixed(2)}) dépassent le montant réglé (${amount.toFixed(2)})`
      );
    }

    // Refuse to over-settle any single document.
    for (const alloc of allocations) {
      const allocAmount = roundMoney(alloc.amount);
      if (allocAmount.lessThanOrEqualTo(0)) {
        throw domainError("VALIDATION_FAILED", "Une affectation doit être positive");
      }
      if (alloc.invoiceId) {
        const invoice = await tx.invoice.findFirst({
          where: { id: alloc.invoiceId, tenantId },
          select: { amountDue: true, number: true, status: true },
        });
        if (!invoice) throw domainError("NOT_FOUND", "Facture introuvable");
        if (!["Posted", "Paid"].includes(invoice.status)) {
          throw domainError(
            "INVALID_STATE_TRANSITION",
            `La facture ${invoice.number} n'est pas comptabilisée`
          );
        }
        if (allocAmount.greaterThan(dec(invoice.amountDue))) {
          throw domainError(
            "OVER_ALLOCATION",
            `Affectation ${allocAmount.toFixed(2)} supérieure au solde de la facture ${invoice.number} (${dec(invoice.amountDue).toFixed(2)})`
          );
        }
      }
      if (alloc.supplierBillId) {
        const bill = await tx.supplierBill.findFirst({
          where: { id: alloc.supplierBillId, tenantId },
          select: { amountDue: true, number: true },
        });
        if (!bill) throw domainError("NOT_FOUND", "Facture fournisseur introuvable");
        if (allocAmount.greaterThan(dec(bill.amountDue))) {
          throw domainError(
            "OVER_ALLOCATION",
            `Affectation supérieure au solde de la facture ${bill.number}`
          );
        }
      }
    }

    const number = await nextNumber(tx, tenantId, "Payment", date.getFullYear());
    const treasury = treasuryAccountFor(input.method);

    const entry = await postEntry(tx, {
      tenantId,
      date,
      description:
        direction === "INBOUND"
          ? `Règlement client ${company.name} — ${number}`
          : `Règlement fournisseur ${company.name} — ${number}`,
      journalCode: treasury === "5161" ? "CAI" : "BQ",
      sourceType: "Payment",
      sourceId: number,
      userId: input.userId,
      lines:
        direction === "INBOUND"
          ? [
              { accountCode: treasury, debit: amount, description: `Encaissement ${number}` },
              {
                accountCode: "3421",
                companyId: company.id,
                credit: amount,
                description: `Règlement client ${company.name}`,
              },
            ]
          : [
              {
                accountCode: "4411",
                companyId: company.id,
                debit: amount,
                description: `Règlement fournisseur ${company.name}`,
              },
              { accountCode: treasury, credit: amount, description: `Décaissement ${number}` },
            ],
    });

    const payment = await tx.payment.create({
      data: {
        tenantId,
        number,
        companyId: company.id,
        direction,
        date,
        amount: new Prisma.Decimal(amount.toFixed(6)),
        allocatedAmount: new Prisma.Decimal(allocatedTotal.toFixed(6)),
        method: input.method,
        reference: input.reference ?? null,
        notes: input.notes ?? null,
        status: "Posted",
        journalEntryId: entry.id,
        allocations: {
          create: allocations.map((a) => ({
            tenantId,
            invoiceId: a.invoiceId ?? null,
            supplierBillId: a.supplierBillId ?? null,
            amount: new Prisma.Decimal(roundMoney(a.amount).toFixed(6)),
          })),
        },
      },
    });

    await tx.journalEntry.update({ where: { id: entry.id }, data: { sourceId: payment.id } });

    for (const alloc of allocations) {
      if (alloc.invoiceId) await refreshInvoiceSettlement(tx, alloc.invoiceId);
      if (alloc.supplierBillId) await refreshBillSettlement(tx, alloc.supplierBillId);
    }

    await audit(tx, {
      tenantId,
      userId: input.userId,
      entityType: "Payment",
      entityId: payment.id,
      action: "POST",
      diff: { number, amount: amount.toFixed(2), allocations: allocations.length },
    });

    return serialize(payment);
  });
}

/** Convenience wrapper for the common "pay this one invoice" case. */
export async function payInvoice(
  invoiceId: string,
  input: { amount: number | string; method: string; date?: Date; reference?: string }
) {
  const tenantId = await getTenantId();
  const invoice = await withTenant(tenantId, (tx) =>
    tx.invoice.findFirst({ where: { id: invoiceId, tenantId }, select: { companyId: true } })
  );
  if (!invoice) throw domainError("NOT_FOUND", "Facture introuvable");

  return registerPayment({
    companyId: invoice.companyId,
    direction: "INBOUND",
    amount: input.amount,
    method: input.method,
    date: input.date,
    reference: input.reference,
    allocations: [{ invoiceId, amount: input.amount }],
  });
}

export async function paySupplierBill(
  supplierBillId: string,
  input: { amount: number | string; method: string; date?: Date; reference?: string }
) {
  const tenantId = await getTenantId();
  const bill = await withTenant(tenantId, (tx) =>
    tx.supplierBill.findFirst({ where: { id: supplierBillId, tenantId }, select: { companyId: true } })
  );
  if (!bill) throw domainError("NOT_FOUND", "Facture fournisseur introuvable");

  return registerPayment({
    companyId: bill.companyId,
    direction: "OUTBOUND",
    amount: input.amount,
    method: input.method,
    date: input.date,
    reference: input.reference,
    allocations: [{ supplierBillId, amount: input.amount }],
  });
}

/** A bounced cheque reverses the entry and reopens the settled documents. */
export async function markPaymentBounced(paymentId: string, reason: string) {
  const tenantId = await getTenantId();

  return withTenant(tenantId, async (tx) => {
    const payment = await tx.payment.findFirst({
      where: { id: paymentId, tenantId },
      include: { allocations: true },
    });
    if (!payment) throw domainError("NOT_FOUND", "Règlement introuvable");
    if (payment.status === "Bounced") {
      throw domainError("INVALID_STATE_TRANSITION", "Règlement déjà rejeté");
    }

    if (payment.journalEntryId) {
      await reverseEntry(tx, tenantId, payment.journalEntryId, {
        reason: `Impayé ${payment.number} — ${reason}`,
      });
    }

    const touchedInvoices = payment.allocations.map((a) => a.invoiceId).filter(Boolean) as string[];
    const touchedBills = payment.allocations.map((a) => a.supplierBillId).filter(Boolean) as string[];

    await tx.paymentAllocation.deleteMany({ where: { paymentId } });
    await tx.payment.update({
      where: { id: paymentId },
      data: { status: "Bounced", allocatedAmount: new Prisma.Decimal(0) },
    });

    for (const id of touchedInvoices) await refreshInvoiceSettlement(tx, id);
    for (const id of touchedBills) await refreshBillSettlement(tx, id);

    await audit(tx, {
      tenantId,
      entityType: "Payment",
      entityId: paymentId,
      action: "REVERSE",
      reason,
    });

    return { bounced: true };
  });
}

export async function getPayments() {
  const tenantId = await getTenantId();
  const rows = await withTenant(tenantId, (tx) =>
    tx.payment.findMany({
      where: { tenantId },
      include: { company: true, allocations: true },
      orderBy: { date: "desc" },
      take: 200,
    })
  );
  return serialize(rows);
}
