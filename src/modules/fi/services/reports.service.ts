"use server";

import { withTenant } from "@/shared/db/prisma";
import { getTenantId } from "@/lib/auth";
import { dec, sum, toNumber } from "@/shared/money";
import { LEDGER_STATUSES } from "@/modules/finance/services/posting.service";
import { getARAging } from "@/modules/finance/services/financial-statements.service";

/**
 * VAT return figures.
 *
 * Collected VAT comes from the tax breakdown stored on each posted invoice, so the
 * declaration matches what was actually printed and cleared — not a recomputation
 * that could drift if a rate changed. Deductible VAT comes from supplier bills.
 */
export async function getTvaSummary(month: number, year: number) {
  const tenantId = await getTenantId();

  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  return withTenant(tenantId, async (tx) => {
    const invoices = await tx.invoice.findMany({
      where: {
        tenantId,
        date: { gte: startDate, lte: endDate },
        status: { in: ["Posted", "Paid"] },
      },
      select: { subtotal: true, tvaAmount: true, taxBreakdown: true },
    });

    const creditNotes = await tx.creditNote.findMany({
      where: {
        tenantId,
        date: { gte: startDate, lte: endDate },
        status: "Posted",
      },
      select: { subtotal: true, tvaAmount: true },
    });

    const bills = await tx.supplierBill.findMany({
      where: {
        tenantId,
        date: { gte: startDate, lte: endDate },
        status: { in: ["Posted", "Paid"] },
      },
      select: { subtotal: true, tvaAmount: true },
    });

    const collected = sum(invoices.map((i) => i.tvaAmount)).minus(
      sum(creditNotes.map((c) => c.tvaAmount))
    );
    const deductible = sum(bills.map((b) => b.tvaAmount));
    const salesBase = sum(invoices.map((i) => i.subtotal)).minus(
      sum(creditNotes.map((c) => c.subtotal))
    );
    const purchaseBase = sum(bills.map((b) => b.subtotal));

    // Per-rate detail, which is what the declaration form actually asks for.
    const byRate = new Map<string, { rate: number; base: number; amount: number }>();
    for (const inv of invoices) {
      const breakdown =
        (inv.taxBreakdown as Array<{ rate: number; base: number; amount: number }> | null) ?? [];
      for (const b of breakdown) {
        const key = String(b.rate);
        const current = byRate.get(key) ?? { rate: b.rate, base: 0, amount: 0 };
        current.base += b.base;
        current.amount += b.amount;
        byRate.set(key, current);
      }
    }

    return {
      period: `${year}-${String(month).padStart(2, "0")}`,
      salesBase: toNumber(salesBase),
      purchaseBase: toNumber(purchaseBase),
      collected: toNumber(collected),
      deductible: toNumber(deductible),
      netPayable: toNumber(collected.minus(deductible)),
      byRate: [...byRate.values()].sort((a, b) => a.rate - b.rate),
      invoiceCount: invoices.length,
      billCount: bills.length,
    };
  });
}

/**
 * Aged receivables grouped by customer — the view a manager acts on. The invoice-level
 * detail lives in getARAging; both read the same buckets so the totals always agree.
 */
export async function getAgedReceivables() {
  const report = await getARAging();

  const byCompany = new Map<
    string,
    { companyId: string; companyName: string; current: number; days30: number; days60: number; days90Plus: number; totalDue: number }
  >();

  for (const inv of report.invoices) {
    const row =
      byCompany.get(inv.companyId) ??
      {
        companyId: inv.companyId,
        companyName: inv.company,
        current: 0,
        days30: 0,
        days60: 0,
        days90Plus: 0,
        totalDue: 0,
      };

    if (inv.bucket === "current") row.current += inv.amountDue;
    else if (inv.bucket === "days1_30") row.days30 += inv.amountDue;
    else if (inv.bucket === "days31_60") row.days60 += inv.amountDue;
    else row.days90Plus += inv.amountDue;

    row.totalDue += inv.amountDue;
    byCompany.set(inv.companyId, row);
  }

  return [...byCompany.values()].sort((a, b) => b.totalDue - a.totalDue);
}

/** Cash position from the treasury accounts. */
export async function getCashPosition() {
  const tenantId = await getTenantId();

  return withTenant(tenantId, async (tx) => {
    const accounts = await tx.account.findMany({
      where: { tenantId, code: { startsWith: "5" }, isActive: true },
      select: { id: true, code: true, name: true },
    });
    if (accounts.length === 0) return { accounts: [], total: 0 };

    const grouped = await tx.journalEntryLine.groupBy({
      by: ["accountId"],
      where: {
        tenantId,
        accountId: { in: accounts.map((a) => a.id) },
        journalEntry: { status: { in: [...LEDGER_STATUSES] } },
      },
      _sum: { debit: true, credit: true },
    });
    const byId = new Map(grouped.map((g) => [g.accountId, g]));

    const rows = accounts.map((a) => {
      const g = byId.get(a.id);
      const balance = dec(g?._sum.debit ?? 0).minus(dec(g?._sum.credit ?? 0));
      return { code: a.code, name: a.name, balance: toNumber(balance) };
    });

    return { accounts: rows, total: rows.reduce((acc, r) => acc + r.balance, 0) };
  });
}
