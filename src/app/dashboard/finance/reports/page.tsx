import { getTrialBalance } from "@/modules/finance/services/report.service";
import {
  getIncomeStatement,
  getBalanceSheet,
  getARAging,
  getAPAging,
} from "@/modules/finance/services/financial-statements.service";
import { ReportsClientView } from "./ReportsClientView";
import { ChartBarIcon } from "@heroicons/react/24/outline";

export default async function ReportsPage() {
  const [trialBalance, cpc, bilan, arAging, apAging] = await Promise.all([
    getTrialBalance(),
    getIncomeStatement(),
    getBalanceSheet(),
    getARAging(),
    getAPAging(),
  ]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ChartBarIcon className="h-8 w-8 text-primary" />
            Financial Statements &amp; Reports (FI/CO)
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Real-time financial accounting: Balance Générale, Compte de Résultat (CPC), Bilan, and Aged AR/AP.
          </p>
        </div>
      </div>

      <ReportsClientView
        trialBalance={trialBalance}
        cpc={cpc}
        bilan={bilan}
        arAging={arAging}
        apAging={apAging}
      />
    </div>
  );
}
