"use server";

import { withTenant, type Tx } from "@/shared/db/prisma";
import { getTenantId } from "@/lib/auth";
import { dec, toNumber } from "@/shared/money";
import { LEDGER_STATUSES } from "@/modules/finance/services/posting.service";

/**
 * Statutory reports, computed from the ledger by the database.
 *
 * These queries aggregate in Postgres rather than loading every journal line into
 * memory: an SME with three years of history has hundreds of thousands of lines, and
 * a report that reads them all is a report nobody opens twice.
 *
 * Draft entries never appear. Reversed entries DO: the original and its mirror both
 * stay in the ledger and cancel each other out (see LEDGER_STATUSES).
 */

interface AccountBalance {
  code: string;
  name: string;
  type: string;
  debit: number;
  credit: number;
  balance: number;
}

async function accountBalances(
  tx: Tx,
  tenantId: string,
  range?: { from?: Date; to?: Date }
): Promise<AccountBalance[]> {
  const grouped = await tx.journalEntryLine.groupBy({
    by: ["accountId"],
    where: {
      tenantId,
      journalEntry: {
        status: { in: [...LEDGER_STATUSES] },
        ...(range?.from || range?.to
          ? { date: { ...(range.from ? { gte: range.from } : {}), ...(range.to ? { lte: range.to } : {}) } }
          : {}),
      },
    },
    _sum: { debit: true, credit: true },
  });

  if (grouped.length === 0) return [];

  const accounts = await tx.account.findMany({
    where: { tenantId, id: { in: grouped.map((g) => g.accountId) } },
    select: { id: true, code: true, name: true, type: true },
  });
  const byId = new Map(accounts.map((a) => [a.id, a]));

  return grouped
    .map((g) => {
      const account = byId.get(g.accountId);
      const debit = dec(g._sum.debit ?? 0);
      const credit = dec(g._sum.credit ?? 0);
      return {
        code: account?.code ?? "",
        name: account?.name ?? "",
        type: account?.type ?? "",
        debit: toNumber(debit),
        credit: toNumber(credit),
        balance: toNumber(debit.minus(credit)),
      };
    })
    .sort((a, b) => a.code.localeCompare(b.code));
}

/** Balance générale — the report an accountant checks first. */
export async function getTrialBalance(range?: { from?: Date; to?: Date }) {
  const tenantId = await getTenantId();
  return withTenant(tenantId, async (tx) => {
    const rows = await accountBalances(tx, tenantId, range);
    const totalDebit = rows.reduce((acc, r) => acc + r.debit, 0);
    const totalCredit = rows.reduce((acc, r) => acc + r.credit, 0);
    return {
      rows,
      totalDebit,
      totalCredit,
      // If this is ever false the ledger is corrupt; the invariant checker will say so.
      balanced: Math.abs(totalDebit - totalCredit) < 0.005,
    };
  });
}

/** Compte de Produits et Charges (CPC). */
export async function getIncomeStatement(range?: { from?: Date; to?: Date }) {
  const tenantId = await getTenantId();

  return withTenant(tenantId, async (tx) => {
    const rows = await accountBalances(tx, tenantId, range);

    // Class 7 is credit-normal (revenue), class 6 is debit-normal (expense).
    const revenues = rows
      .filter((r) => r.code.startsWith("7"))
      .map((r) => ({ ...r, balance: r.credit - r.debit }));
    const expenses = rows
      .filter((r) => r.code.startsWith("6"))
      .map((r) => ({ ...r, balance: r.debit - r.credit }));

    const operatingRevenues = revenues.filter((r) => r.code.startsWith("71"));
    const operatingExpenses = expenses.filter((r) => r.code.startsWith("61"));

    const totalOperatingRevenue = operatingRevenues.reduce((a, r) => a + r.balance, 0);
    const totalOperatingExpenses = operatingExpenses.reduce((a, r) => a + r.balance, 0);
    const totalRevenue = revenues.reduce((a, r) => a + r.balance, 0);
    const totalExpenses = expenses.reduce((a, r) => a + r.balance, 0);

    return {
      operatingRevenues,
      totalOperatingRevenue,
      operatingExpenses,
      totalOperatingExpenses,
      operatingResult: totalOperatingRevenue - totalOperatingExpenses,
      allRevenues: revenues,
      allExpenses: expenses,
      totalRevenue,
      totalExpenses,
      // Before corporate tax (IS).
      netIncome: totalRevenue - totalExpenses,
    };
  });
}

/** Bilan — actif / passif. */
export async function getBalanceSheet(asOf?: Date) {
  const tenantId = await getTenantId();

  const income = await getIncomeStatement(asOf ? { to: asOf } : undefined);

  return withTenant(tenantId, async (tx) => {
    const rows = await accountBalances(tx, tenantId, asOf ? { to: asOf } : undefined);

    const immobilisations = rows.filter((r) => r.code.startsWith("2") && r.balance > 0);
    const actifCirculant = rows.filter((r) => r.code.startsWith("3") && r.balance > 0);
    const tresorerieActif = rows.filter((r) => r.code.startsWith("5") && r.balance > 0);

    const financementPermanent = rows
      .filter((r) => r.code.startsWith("1") && r.balance < 0)
      .map((r) => ({ ...r, balance: Math.abs(r.balance) }));
    const passifCirculant = rows
      .filter((r) => r.code.startsWith("4") && r.balance < 0)
      .map((r) => ({ ...r, balance: Math.abs(r.balance) }));
    const tresoreriePassif = rows
      .filter((r) => r.code.startsWith("5") && r.balance < 0)
      .map((r) => ({ ...r, balance: Math.abs(r.balance) }));

    const total = (list: AccountBalance[]) => list.reduce((a, r) => a + r.balance, 0);

    const totalImmobilisations = total(immobilisations);
    const totalActifCirculant = total(actifCirculant);
    const totalTresorerieActif = total(tresorerieActif);
    const totalActif = totalImmobilisations + totalActifCirculant + totalTresorerieActif;

    const totalFinancementPermanent = total(financementPermanent);
    const totalPassifCirculant = total(passifCirculant);
    const totalTresoreriePassif = total(tresoreriePassif);
    const equityResult = income.netIncome;
    const totalPassif =
      totalFinancementPermanent + totalPassifCirculant + totalTresoreriePassif + equityResult;

    return {
      immobilisations,
      totalImmobilisations,
      actifCirculant,
      totalActifCirculant,
      tresorerieActif,
      totalTresorerieActif,
      totalActif,
      financementPermanent,
      totalFinancementPermanent,
      passifCirculant,
      totalPassifCirculant,
      tresoreriePassif,
      totalTresoreriePassif,
      equityResult,
      totalPassif,
      // Actif and passif must agree once the result is carried; a gap means a
      // missing or unbalanced posting.
      balanced: Math.abs(totalActif - totalPassif) < 0.005,
    };
  });
}

type Bucket = "current" | "days1_30" | "days31_60" | "days61_plus";

function bucketFor(dueDate: Date, now: Date): { bucket: Bucket; days: number } {
  const days = Math.floor((now.getTime() - dueDate.getTime()) / 86_400_000);
  if (days <= 0) return { bucket: "current", days: 0 };
  if (days <= 30) return { bucket: "days1_30", days };
  if (days <= 60) return { bucket: "days31_60", days };
  return { bucket: "days61_plus", days };
}

/**
 * Aged receivables, bucketed by how overdue the invoice is — measured from the DUE
 * date, not the issue date. Bucketing on the issue date reports an invoice with 60-day
 * terms as overdue on day 31, which is the fastest way to lose an accountant's trust.
 */
export async function getARAging(asOf: Date = new Date()) {
  const tenantId = await getTenantId();

  return withTenant(tenantId, async (tx) => {
    const invoices = await tx.invoice.findMany({
      where: { tenantId, status: { in: ["Posted", "Paid"] }, amountDue: { gt: 0 } },
      include: { company: true },
      orderBy: { dueDate: "asc" },
    });

    const buckets: Record<Bucket, number> = {
      current: 0,
      days1_30: 0,
      days31_60: 0,
      days61_plus: 0,
    };

    const rows = invoices.map((inv) => {
      const due = inv.dueDate ?? inv.date;
      const { bucket, days } = bucketFor(due, asOf);
      const amount = toNumber(inv.amountDue);
      buckets[bucket] += amount;
      return {
        id: inv.id,
        number: inv.number,
        company: inv.company.name,
        companyId: inv.companyId,
        date: inv.date,
        dueDate: due,
        amountDue: amount,
        days,
        bucket,
      };
    });

    return {
      buckets,
      total: rows.reduce((a, r) => a + r.amountDue, 0),
      invoices: rows,
    };
  });
}

export async function getAPAging(asOf: Date = new Date()) {
  const tenantId = await getTenantId();

  return withTenant(tenantId, async (tx) => {
    const bills = await tx.supplierBill.findMany({
      where: { tenantId, status: { in: ["Posted", "Paid"] }, amountDue: { gt: 0 } },
      include: { company: true },
      orderBy: { dueDate: "asc" },
    });

    const buckets: Record<Bucket, number> = {
      current: 0,
      days1_30: 0,
      days31_60: 0,
      days61_plus: 0,
    };

    const rows = bills.map((bill) => {
      const due = bill.dueDate ?? bill.date;
      const { bucket, days } = bucketFor(due, asOf);
      const amount = toNumber(bill.amountDue);
      buckets[bucket] += amount;
      return {
        id: bill.id,
        number: bill.number,
        company: bill.company.name,
        companyId: bill.companyId,
        date: bill.date,
        dueDate: due,
        amountDue: amount,
        days,
        bucket,
      };
    });

    return {
      buckets,
      total: rows.reduce((a, r) => a + r.amountDue, 0),
      bills: rows,
    };
  });
}

/**
 * Partner statement from the ledger — only possible because receivable and payable
 * lines carry the partner.
 */
export async function getPartnerLedger(companyId: string) {
  const tenantId = await getTenantId();

  return withTenant(tenantId, async (tx) => {
    const lines = await tx.journalEntryLine.findMany({
      where: { tenantId, companyId, journalEntry: { status: { in: [...LEDGER_STATUSES] } } },
      include: { journalEntry: true, account: true },
      orderBy: { journalEntry: { date: "asc" } },
    });

    let running = dec(0);
    const rows = lines.map((l) => {
      running = running.plus(dec(l.debit)).minus(dec(l.credit));
      return {
        date: l.journalEntry.date,
        entryNumber: l.journalEntry.number,
        description: l.description ?? l.journalEntry.description,
        account: `${l.account.code} ${l.account.name}`,
        debit: toNumber(l.debit),
        credit: toNumber(l.credit),
        balance: toNumber(running),
      };
    });

    return { rows, balance: toNumber(running) };
  });
}
