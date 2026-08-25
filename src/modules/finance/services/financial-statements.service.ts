"use server";

import { prisma } from "@/shared/db/prisma";
import { getTenantId } from "@/lib/auth";

/**
 * Moroccan Income Statement / Compte de Produits et Charges (CPC)
 */
export async function getIncomeStatement() {
  const tenantId = await getTenantId();

  const lines = await prisma.journalEntryLine.findMany({
    where: { tenantId },
    include: { account: true },
  });

  const accountTotals: Record<string, { code: string; name: string; type: string; balance: number }> = {};

  for (const line of lines) {
    const code = line.account.code;
    if (!accountTotals[code]) {
      accountTotals[code] = {
        code,
        name: line.account.name,
        type: line.account.type,
        balance: 0,
      };
    }
    // For Class 7 (Revenue): Credit increases revenue, Debit reduces revenue
    // For Class 6 (Expense): Debit increases expense, Credit reduces expense
    if (code.startsWith("7")) {
      accountTotals[code].balance += line.credit - line.debit;
    } else if (code.startsWith("6")) {
      accountTotals[code].balance += line.debit - line.credit;
    }
  }

  // Group by Moroccan CPC sections
  const operatingRevenues = Object.values(accountTotals).filter((a) => a.code.startsWith("71"));
  const totalOperatingRevenue = operatingRevenues.reduce((acc, a) => acc + Math.max(0, a.balance), 0);

  const operatingExpenses = Object.values(accountTotals).filter((a) => a.code.startsWith("61"));
  const totalOperatingExpenses = operatingExpenses.reduce((acc, a) => acc + Math.max(0, a.balance), 0);

  const operatingResult = totalOperatingRevenue - totalOperatingExpenses;
  const netIncome = operatingResult; // In MVP before corporate tax IS

  return {
    operatingRevenues,
    totalOperatingRevenue,
    operatingExpenses,
    totalOperatingExpenses,
    operatingResult,
    netIncome,
  };
}

/**
 * Moroccan Balance Sheet / Bilan (Actif vs Passif)
 */
export async function getBalanceSheet() {
  const tenantId = await getTenantId();

  const lines = await prisma.journalEntryLine.findMany({
    where: { tenantId },
    include: { account: true },
  });

  const accountBalances: Record<string, { code: string; name: string; debit: number; credit: number; balance: number }> = {};

  for (const line of lines) {
    const code = line.account.code;
    if (!accountBalances[code]) {
      accountBalances[code] = {
        code,
        name: line.account.name,
        debit: 0,
        credit: 0,
        balance: 0,
      };
    }
    accountBalances[code].debit += line.debit;
    accountBalances[code].credit += line.credit;
  }

  // Calculate net balances per account
  for (const code in accountBalances) {
    const acc = accountBalances[code];
    acc.balance = acc.debit - acc.credit;
  }

  // ACTIF (Assets: Class 2, 3, 51XX)
  const actifCirculant = Object.values(accountBalances).filter(
    (a) => a.code.startsWith("3") && a.balance > 0
  );
  const tresorerieActif = Object.values(accountBalances).filter(
    (a) => a.code.startsWith("51") && a.balance > 0
  );

  const totalActifCirculant = actifCirculant.reduce((acc, a) => acc + a.balance, 0);
  const totalTresorerieActif = tresorerieActif.reduce((acc, a) => acc + a.balance, 0);
  const totalActif = totalActifCirculant + totalTresorerieActif;

  // PASSIF (Liabilities: Class 1, 4, 55XX)
  const passifCirculant = Object.values(accountBalances).filter(
    (a) => a.code.startsWith("4") && a.balance < 0
  ).map((a) => ({ ...a, balance: Math.abs(a.balance) }));

  const totalPassifCirculant = passifCirculant.reduce((acc, a) => acc + a.balance, 0);

  // Compute Net P&L for Equity (Capitaux Propres)
  const cpc = await getIncomeStatement();
  const equityResult = cpc.netIncome;

  const totalPassif = totalPassifCirculant + equityResult;

  return {
    actifCirculant,
    totalActifCirculant,
    tresorerieActif,
    totalTresorerieActif,
    totalActif,
    passifCirculant,
    totalPassifCirculant,
    equityResult,
    totalPassif,
  };
}

/**
 * Aged Accounts Receivable (AR Aging)
 */
export async function getARAging() {
  const tenantId = await getTenantId();
  const now = new Date();

  const unpaidInvoices = await prisma.invoice.findMany({
    where: {
      tenantId,
      status: { in: ["Finalized", "Sent", "Overdue"] },
      amountDue: { gt: 0 },
    },
    include: { company: true },
  });

  const buckets = {
    current: 0,
    days1_30: 0,
    days31_60: 0,
    days61_plus: 0,
  };

  const invoiceList: any[] = [];

  for (const inv of unpaidInvoices) {
    const diffTime = Math.abs(now.getTime() - new Date(inv.date).getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let bucket = "current";
    if (diffDays > 60) {
      buckets.days61_plus += inv.amountDue;
      bucket = "days61_plus";
    } else if (diffDays > 30) {
      buckets.days31_60 += inv.amountDue;
      bucket = "days31_60";
    } else if (diffDays > 0) {
      buckets.days1_30 += inv.amountDue;
      bucket = "days1_30";
    } else {
      buckets.current += inv.amountDue;
    }

    invoiceList.push({
      id: inv.id,
      number: inv.number,
      company: inv.company.name,
      amountDue: inv.amountDue,
      days: diffDays,
      bucket,
    });
  }

  return {
    buckets,
    total: unpaidInvoices.reduce((acc, i) => acc + i.amountDue, 0),
    invoices: invoiceList,
  };
}

/**
 * Aged Accounts Payable (AP Aging)
 */
export async function getAPAging() {
  const tenantId = await getTenantId();
  const now = new Date();

  const unpaidBills = await prisma.supplierBill.findMany({
    where: {
      tenantId,
      status: { in: ["Posted", "Draft"] },
      amountDue: { gt: 0 },
    },
    include: { company: true },
  });

  const buckets = {
    current: 0,
    days1_30: 0,
    days31_60: 0,
    days61_plus: 0,
  };

  const billList: any[] = [];

  for (const bill of unpaidBills) {
    const diffTime = Math.abs(now.getTime() - new Date(bill.date).getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let bucket = "current";
    if (diffDays > 60) {
      buckets.days61_plus += bill.amountDue;
      bucket = "days61_plus";
    } else if (diffDays > 30) {
      buckets.days31_60 += bill.amountDue;
      bucket = "days31_60";
    } else if (diffDays > 0) {
      buckets.days1_30 += bill.amountDue;
      bucket = "days1_30";
    } else {
      buckets.current += bill.amountDue;
    }

    billList.push({
      id: bill.id,
      number: bill.number,
      company: bill.company.name,
      amountDue: bill.amountDue,
      days: diffDays,
      bucket,
    });
  }

  return {
    buckets,
    total: unpaidBills.reduce((acc, b) => acc + b.amountDue, 0),
    bills: billList,
  };
}
