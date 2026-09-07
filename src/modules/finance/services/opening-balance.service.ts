import type { Tx } from "@/shared/db/prisma";
import { dec, roundMoney, sum, type Numeric } from "@/shared/money";
import { domainError } from "@/shared/errors";
import { postEntry, resolvePeriod } from "./posting.service";
import { audit } from "@/modules/platform/services/audit.service";

export interface OpeningBalanceLineInput {
  accountCode: string;
  debit: Numeric;
  credit: Numeric;
  description?: string;
  companyId?: string | null;
}

export interface ValidateOpeningBalanceResult {
  isValid: boolean;
  totalDebit: string;
  totalCredit: string;
  isBalanced: boolean;
  missingAccounts: string[];
  periodError?: string;
  errors: string[];
  warnings: string[];
}

/**
 * Validates a batch of opening balance lines without creating any records:
 * 1. Checks that total debits strictly equal total credits in exact Decimal.
 * 2. Verifies that all account codes exist in the tenant's Chart of Accounts.
 *    (Explicitly rejects unmatched accounts; never creates accounts with dummy types).
 * 3. Verifies that the target accounting period is open.
 */
export async function validateOpeningBalanceBatch(
  tx: Tx,
  tenantId: string,
  lines: OpeningBalanceLineInput[],
  date: Date = new Date()
): Promise<ValidateOpeningBalanceResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (lines.length < 2) {
    errors.push("Une balance d'ouverture exige au moins deux lignes.");
  }

  // Decimal summation with exact precision
  const totalDebitDec = roundMoney(sum(lines.map((l) => dec(l.debit ?? 0))), 6);
  const totalCreditDec = roundMoney(sum(lines.map((l) => dec(l.credit ?? 0))), 6);
  const isBalanced = totalDebitDec.equals(totalCreditDec) && !totalDebitDec.isZero();

  if (!totalDebitDec.equals(totalCreditDec)) {
    errors.push(
      `Écart de balance détecté : Total Débit (${totalDebitDec.toFixed(2)} MAD) ≠ Total Crédit (${totalCreditDec.toFixed(2)} MAD). Écart: ${totalDebitDec.minus(totalCreditDec).abs().toFixed(2)} MAD.`
    );
  } else if (totalDebitDec.isZero()) {
    errors.push("La balance d'ouverture ne peut pas avoir un montant total nul.");
  }

  // Account verification against tenant Chart of Accounts
  const uniqueAccountCodes = Array.from(new Set(lines.map((l) => l.accountCode.trim())));
  const existingAccounts = await tx.account.findMany({
    where: {
      tenantId,
      code: { in: uniqueAccountCodes },
    },
    select: { code: true, name: true, type: true },
  });

  const existingCodeSet = new Set(existingAccounts.map((a) => a.code));
  const missingAccounts = uniqueAccountCodes.filter((code) => !existingCodeSet.has(code));

  if (missingAccounts.length > 0) {
    errors.push(
      `Comptes non répertoriés dans le plan comptable du tenant : ${missingAccounts.join(", ")}. Veuillez d'abord créer ou activer ces comptes dans votre plan comptable avant d'importer la balance.`
    );
  }

  // Period check
  let periodError: string | undefined;
  try {
    const period = await resolvePeriod(tx, tenantId, date);
    if (!period) {
      warnings.push(
        "Aucun exercice comptable n'est actuellement configuré pour cette date. L'écriture sera enregistrée sans rattachement de période préalable."
      );
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    periodError = msg;
    errors.push(msg);
  }

  return {
    isValid: errors.length === 0,
    totalDebit: totalDebitDec.toFixed(2),
    totalCredit: totalCreditDec.toFixed(2),
    isBalanced,
    missingAccounts,
    periodError,
    errors,
    warnings,
  };
}

export interface PostOpeningBalanceInput {
  tenantId: string;
  date?: Date;
  description?: string;
  lines: OpeningBalanceLineInput[];
  userId?: string | null;
  importJobId?: string;
}

/**
 * Dedicated canonical opening-balance posting service.
 * Posts an immutable, balanced journal entry in the "OD" journal using postEntry.
 */
export async function postOpeningBalanceEntry(
  tx: Tx,
  input: PostOpeningBalanceInput
) {
  const { tenantId, lines, userId, importJobId } = input;
  const date = input.date ?? new Date();
  const description = input.description || "Bilan d'ouverture — Migration initiale";

  // 1. Re-validate complete batch within the transaction
  const validation = await validateOpeningBalanceBatch(tx, tenantId, lines, date);
  if (!validation.isValid) {
    throw domainError(
      "UNBALANCED_ENTRY",
      `Validation de la balance d'ouverture échouée : ${validation.errors.join(" | ")}`,
      { errors: validation.errors }
    );
  }

  // 2. Post through canonical posting service (in "OD" journal)
  const entry = await postEntry(tx, {
    tenantId,
    date,
    description,
    journalCode: "OD",
    sourceType: "OpeningBalance",
    sourceId: importJobId ?? undefined,
    userId: userId ?? null,
    lines: lines.map((l) => ({
      accountCode: l.accountCode.trim(),
      debit: dec(l.debit ?? 0),
      credit: dec(l.credit ?? 0),
      description: l.description || description,
      companyId: l.companyId ?? null,
    })),
  });

  // 3. Write explicit domain audit record
  await audit(tx, {
    tenantId,
    userId: userId ?? null,
    entityType: "OpeningBalance",
    entityId: entry.id,
    action: "POST",
    diff: {
      journalEntryId: entry.id,
      number: entry.number,
      totalAmount: validation.totalDebit,
      importJobId: importJobId ?? null,
      lineCount: lines.length,
    },
    reason: "Migration / saisie de balance d'ouverture",
  });

  return entry;
}
