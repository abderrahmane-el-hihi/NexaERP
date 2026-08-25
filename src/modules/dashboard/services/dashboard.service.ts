import { prisma } from "@/shared/db/prisma";
import { getTenantId } from "@/lib/auth";

export async function getDashboardData() {
  const tenantId = await getTenantId();

  // Get all accounts and calculate their balances
  const accounts = await prisma.account.findMany({
    where: { tenantId },
    include: {
      lines: true
    }
  });

  const processedAccounts = accounts.map(acc => {
    const totalDebit = acc.lines.reduce((sum, line) => sum + line.debit, 0);
    const totalCredit = acc.lines.reduce((sum, line) => sum + line.credit, 0);
    
    // Asset or Expense: Debit - Credit
    // Liability, Equity, Revenue: Credit - Debit
    const isDebitNormal = acc.type === 'Asset' || acc.type === 'Expense';
    const balance = isDebitNormal ? (totalDebit - totalCredit) : (totalCredit - totalDebit);

    return {
      ...acc,
      balance
    };
  });

  // Filter into categories
  const assets = processedAccounts.filter(a => a.type === 'Asset');
  const liabilities = processedAccounts.filter(a => a.type === 'Liability');
  const revenue = processedAccounts.filter(a => a.type === 'Revenue');

  const totalAssets = assets.reduce((sum, a) => sum + a.balance, 0);
  const totalLiabilities = liabilities.reduce((sum, a) => sum + a.balance, 0);
  const totalRevenue = revenue.reduce((sum, a) => sum + a.balance, 0);

  return {
    assets,
    liabilities,
    revenue,
    totalAssets,
    totalLiabilities,
    totalRevenue
  };
}
