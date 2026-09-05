import { Prisma } from "@/generated/prisma/client";
import type { Tx } from "@/shared/db/prisma";
import { dec, roundMoney, sum, type Numeric } from "@/shared/money";
import { domainError } from "@/shared/errors";
import { nextNumber } from "@/modules/platform/services/sequence.service";
import { audit } from "@/modules/platform/services/audit.service";

/**
 * The single posting engine. Every journal entry in the system is written here and
 * nowhere else, so the invariants hold by construction:
 *
 *   I1  lines sum to zero (debits = credits), checked in Decimal, no epsilon
 *   I4  the number comes from the caller's transaction and rolls back with it
 *   I8  nothing posts into a closed period
 *   I2  posted entries are immutable; corrections are reversals (see reverseEntry)
 *
 * The database enforces the same rules independently (migration
 * 20260905163500_rls_and_integrity), because an invariant defended in one place only
 * is an invariant waiting to be bypassed.
 */

/**
 * Entry statuses that count towards a balance.
 *
 * A reversed entry is NOT removed from the ledger — its mirror image is posted
 * alongside it and the two cancel out. Excluding the original while counting the
 * reversal would subtract the amount twice, which is what these tests caught.
 */
export const LEDGER_STATUSES = ["Posted", "Reversed"] as const;

export interface PostingLine {
  accountCode: string;
  companyId?: string | null;
  debit?: Numeric;
  credit?: Numeric;
  description?: string;
}

export interface PostingInput {
  tenantId: string;
  date: Date;
  description: string;
  journalCode?: string; // VTE, ACH, BQ, OD, STK
  sourceType?: string;
  sourceId?: string;
  lines: PostingLine[];
  userId?: string | null;
  /** Allows an accountant to post into a SoftClosed period. Audited. */
  allowSoftClosed?: boolean;
}

export async function accountByCode(tx: Tx, tenantId: string, code: string) {
  const account = await tx.account.findUnique({
    where: { tenantId_code: { tenantId, code } },
  });
  if (!account) {
    throw domainError(
      "MISSING_ACCOUNT",
      `Compte ${code} introuvable dans le plan comptable`,
      { code }
    );
  }
  return account;
}

/**
 * Resolves the accounting period for a date and refuses closed ones.
 * A missing period is not an error: tenants that have not defined a calendar simply
 * post without a period link, and the close process creates them retroactively.
 */
export async function resolvePeriod(
  tx: Tx,
  tenantId: string,
  date: Date,
  allowSoftClosed = false
) {
  const period = await tx.accountingPeriod.findFirst({
    where: { tenantId, startDate: { lte: date }, endDate: { gte: date } },
  });

  if (!period) return null;

  if (period.status === "Closed") {
    throw domainError(
      "PERIOD_CLOSED",
      `La période ${period.name} est clôturée: aucune écriture ne peut y être passée`,
      { period: period.name, status: period.status }
    );
  }
  if (period.status === "SoftClosed" && !allowSoftClosed) {
    throw domainError(
      "PERIOD_CLOSED",
      `La période ${period.name} est en clôture provisoire: seul un comptable peut y écrire`,
      { period: period.name, status: period.status }
    );
  }
  return period;
}

async function journalIdFor(tx: Tx, tenantId: string, code?: string) {
  if (!code) return null;
  const journal = await tx.journal.findUnique({
    where: { tenantId_code: { tenantId, code } },
  });
  return journal?.id ?? null;
}

/**
 * Writes one balanced, numbered, immutable journal entry.
 * Must be called inside `withTenant` so the tenant context and rollback semantics apply.
 */
export async function postEntry(tx: Tx, input: PostingInput) {
  const { tenantId, date, description, lines } = input;

  if (lines.length < 2) {
    throw domainError("UNBALANCED_ENTRY", "Une écriture comptable exige au moins deux lignes");
  }

  const totalDebit = roundMoney(sum(lines.map((l) => dec(l.debit ?? 0))), 6);
  const totalCredit = roundMoney(sum(lines.map((l) => dec(l.credit ?? 0))), 6);

  // Exact comparison. There is no tolerance: an entry that does not balance is a bug,
  // and hiding it behind an epsilon is how a trial balance silently drifts.
  if (!totalDebit.equals(totalCredit)) {
    throw domainError(
      "UNBALANCED_ENTRY",
      `Écriture déséquilibrée: débit ${totalDebit.toFixed(2)} / crédit ${totalCredit.toFixed(2)}`,
      { debit: totalDebit.toFixed(2), credit: totalCredit.toFixed(2), description }
    );
  }

  if (totalDebit.isZero()) {
    throw domainError("UNBALANCED_ENTRY", "Écriture sans montant");
  }

  for (const line of lines) {
    const d = dec(line.debit ?? 0);
    const c = dec(line.credit ?? 0);
    if (d.isNegative() || c.isNegative()) {
      throw domainError("UNBALANCED_ENTRY", "Une ligne ne peut pas être négative");
    }
    if (!d.isZero() && !c.isZero()) {
      throw domainError(
        "UNBALANCED_ENTRY",
        "Une ligne porte un débit ou un crédit, jamais les deux"
      );
    }
  }

  const period = await resolvePeriod(tx, tenantId, date, input.allowSoftClosed);
  const journalId = await journalIdFor(tx, tenantId, input.journalCode);
  const number = await nextNumber(tx, tenantId, "JournalEntry", date.getFullYear());

  const resolved = await Promise.all(
    lines.map(async (line, index) => {
      const account = await accountByCode(tx, tenantId, line.accountCode);
      return {
        tenantId,
        accountId: account.id,
        companyId: line.companyId ?? null,
        debit: new Prisma.Decimal(dec(line.debit ?? 0).toFixed(6)),
        credit: new Prisma.Decimal(dec(line.credit ?? 0).toFixed(6)),
        description: line.description ?? description,
        position: index,
      };
    })
  );

  const entry = await tx.journalEntry.create({
    data: {
      tenantId,
      journalId,
      periodId: period?.id ?? null,
      number,
      date,
      description,
      status: "Posted",
      sourceType: input.sourceType ?? null,
      sourceId: input.sourceId ?? null,
      lines: { create: resolved },
    },
    include: { lines: true },
  });

  await audit(tx, {
    tenantId,
    userId: input.userId,
    entityType: "JournalEntry",
    entityId: entry.id,
    action: "POST",
    diff: {
      number,
      amount: totalDebit.toFixed(2),
      sourceType: input.sourceType,
      sourceId: input.sourceId,
    },
    reason: input.allowSoftClosed ? "Posted into a soft-closed period" : null,
  });

  return entry;
}

/**
 * Reverses a posted entry by writing its mirror image. The original stays visible and
 * untouched — this is the only legal way to undo a posting (I3).
 */
export async function reverseEntry(
  tx: Tx,
  tenantId: string,
  entryId: string,
  options: { date?: Date; reason: string; userId?: string | null; allowSoftClosed?: boolean }
) {
  const original = await tx.journalEntry.findFirst({
    where: { id: entryId, tenantId },
    include: { lines: { include: { account: true } }, journal: true },
  });

  if (!original) throw domainError("NOT_FOUND", "Écriture introuvable");
  if (original.status === "Reversed") {
    throw domainError("INVALID_STATE_TRANSITION", "Écriture déjà contrepassée");
  }

  const date = options.date ?? new Date();

  const reversal = await postEntry(tx, {
    tenantId,
    date,
    description: `Contrepassation ${original.number} — ${options.reason}`,
    journalCode: original.journal?.code,
    sourceType: original.sourceType ?? undefined,
    sourceId: original.sourceId ?? undefined,
    userId: options.userId,
    allowSoftClosed: options.allowSoftClosed,
    lines: original.lines.map((line) => ({
      accountCode: line.account.code,
      companyId: line.companyId,
      debit: line.credit,
      credit: line.debit,
      description: `Contrepassation — ${line.description ?? ""}`.trim(),
    })),
  });

  await tx.journalEntry.update({
    where: { id: reversal.id },
    data: { reversalOfId: original.id },
  });

  await tx.journalEntry.update({
    where: { id: original.id },
    data: { status: "Reversed" },
  });

  await audit(tx, {
    tenantId,
    userId: options.userId,
    entityType: "JournalEntry",
    entityId: original.id,
    action: "REVERSE",
    reason: options.reason,
    diff: { reversalId: reversal.id, reversalNumber: reversal.number },
  });

  return reversal;
}
