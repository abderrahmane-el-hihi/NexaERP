"use server";

import { prisma } from "@/shared/db/prisma";
import { getTenantId } from "@/lib/auth";
import { ensureStandardCOA } from "./coa.service";

export async function getTrialBalance() {
  const tenantId = await getTenantId();
  await ensureStandardCOA(tenantId);

  // Get all accounts
  const accounts = await prisma.account.findMany({
    where: { tenantId },
    orderBy: { code: "asc" },
  });

  // Calculate balances from JournalEntryLines for Posted journals
  const balances = await prisma.journalEntryLine.groupBy({
    by: ['accountId'],
    where: {
      tenantId,
      journalEntry: {
        status: "Posted"
      }
    },
    _sum: {
      debit: true,
      credit: true,
    },
  });

  const balanceMap = balances.reduce((acc: any, b) => {
    acc[b.accountId] = {
      debit: b._sum.debit || 0,
      credit: b._sum.credit || 0,
    };
    return acc;
  }, {});

  const trialBalance = accounts.map(account => {
    const b = balanceMap[account.id] || { debit: 0, credit: 0 };
    // Normal balance calculation (Simplified)
    // Assets & Expenses usually have Debit balance
    // Liabilities, Equity, Revenue usually have Credit balance
    const netBalance = b.debit - b.credit;
    
    return {
      ...account,
      totalDebit: b.debit,
      totalCredit: b.credit,
      netBalance,
    };
  }).filter(a => a.totalDebit > 0 || a.totalCredit > 0); // Only show accounts with activity

  return trialBalance;
}
