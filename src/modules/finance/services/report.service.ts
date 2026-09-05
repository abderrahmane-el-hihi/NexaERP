"use server";

import { getTrialBalance as trialBalance } from "./financial-statements.service";
import type { TrialBalanceRow } from "@/shared/view-types";

/**
 * The reports view renders rows and sums them itself, so this returns rows shaped for
 * display. The computation lives in financial-statements.service — there is exactly one
 * implementation of the trial balance.
 */
export async function getTrialBalance(): Promise<TrialBalanceRow[]> {
  const report = await trialBalance();

  return report.rows.map((r) => {
    const debitNormal = r.type === "Asset" || r.type === "Expense";
    return {
      id: r.code,
      code: r.code,
      name: r.name,
      type: r.type,
      totalDebit: r.debit,
      totalCredit: r.credit,
      balance: r.balance,
      netBalance: debitNormal ? r.balance : -r.balance,
    };
  });
}
