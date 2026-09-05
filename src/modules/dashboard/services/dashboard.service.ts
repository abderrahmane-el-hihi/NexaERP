import { withTenant } from "@/shared/db/prisma";
import { getTenantId } from "@/lib/auth";
import { dec, toNumber } from "@/shared/money";
import { LEDGER_STATUSES } from "@/modules/finance/services/posting.service";

/**
 * Account balances for the dashboard, computed by the database rather than by
 * summing every ledger line in JavaScript. At a few hundred thousand lines the old
 * approach loaded the whole ledger into memory on every page view.
 */
export async function getDashboardData() {
  const tenantId = await getTenantId();

  return withTenant(tenantId, async (tx) => {
    const accounts = await tx.account.findMany({
      where: { tenantId, isActive: true },
      orderBy: { code: "asc" },
    });

    const grouped = await tx.journalEntryLine.groupBy({
      by: ["accountId"],
      where: { tenantId, journalEntry: { status: { in: [...LEDGER_STATUSES] } } },
      _sum: { debit: true, credit: true },
    });

    const byAccount = new Map(
      grouped.map((g) => [
        g.accountId,
        { debit: dec(g._sum.debit ?? 0), credit: dec(g._sum.credit ?? 0) },
      ])
    );

    const processedAccounts = accounts.map((acc) => {
      const totals = byAccount.get(acc.id) ?? { debit: dec(0), credit: dec(0) };
      const isDebitNormal = acc.type === "Asset" || acc.type === "Expense";
      const balance = isDebitNormal
        ? totals.debit.minus(totals.credit)
        : totals.credit.minus(totals.debit);

      return {
        id: acc.id,
        code: acc.code,
        name: acc.name,
        type: acc.type,
        balance: toNumber(balance),
      };
    });

    const assets = processedAccounts.filter((a) => a.type === "Asset");
    const liabilities = processedAccounts.filter((a) => a.type === "Liability");
    const revenue = processedAccounts.filter((a) => a.type === "Revenue");

    const total = (rows: typeof processedAccounts) =>
      rows.reduce((acc, a) => acc + a.balance, 0);

    return {
      assets,
      liabilities,
      revenue,
      totalAssets: total(assets),
      totalLiabilities: total(liabilities),
      totalRevenue: total(revenue),
    };
  });
}
