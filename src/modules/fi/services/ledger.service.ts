"use server";

import { scopedPrisma } from "@/shared/db/prisma";
import { getTenantId } from "@/lib/auth";

export async function getAccounts() {
  const tenantId = await getTenantId();
  return await scopedPrisma(tenantId).account.findMany({
    where: { tenantId },
    orderBy: { code: "asc" },
  });
}

export async function createAccount(
  data: { code: string; name: string; type: string; description?: string }
) {
  const tenantId = await getTenantId();
  return await scopedPrisma(tenantId).account.create({
    data: {
      tenantId,
      ...data,
    },
  });
}

export async function getJournalEntries() {
  const tenantId = await getTenantId();
  return await scopedPrisma(tenantId).journalEntry.findMany({
    where: { tenantId },
    include: {
      lines: {
        include: { account: true },
      },
    },
    orderBy: { date: "desc" },
  });
}

export async function createJournalEntry(
  data: {
    date: Date;
    description: string;
    sourceType?: string;
    sourceId?: string;
    lines: { accountId: string; debit: number; credit: number; description?: string }[];
  }
) {
  const tenantId = await getTenantId();
  // Validate double entry accounting (Debits == Credits)
  const totalDebit = data.lines.reduce((sum, line) => sum + line.debit, 0);
  const totalCredit = data.lines.reduce((sum, line) => sum + line.credit, 0);

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error("Journal Entry is not balanced: Total Debits must equal Total Credits.");
  }

  const year = data.date.getFullYear();
  // Using a simple timestamp for number since we don't have a sequence for JE yet.
  // In a real scenario, use getNextSequenceNumber for JournalEntry.
  const number = `JE-${year}-${Date.now().toString().slice(-6)}`;

  return await scopedPrisma(tenantId).journalEntry.create({
    data: {
      tenantId,
      number,
      date: data.date,
      description: data.description,
      sourceType: data.sourceType,
      sourceId: data.sourceId,
      status: "Posted",
      lines: {
        create: data.lines.map(l => ({
          tenantId,
          accountId: l.accountId,
          debit: l.debit,
          credit: l.credit,
          description: l.description,
        })),
      },
    },
  });
}
