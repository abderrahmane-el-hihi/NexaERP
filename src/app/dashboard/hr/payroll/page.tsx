import { Badge } from "@/components/ui/badge";
import { getPayrollRuns } from "@/modules/hr/services/payroll.service";
import { RunPayrollDialog } from "@/modules/hr/components/RunPayrollDialog";
import { CalculatorIcon, ArrowLeftIcon, CheckCircleIcon, TableCellsIcon, DocumentTextIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

export default async function PayrollPage() {
  const payrollRuns = await getPayrollRuns();

  const totalGrossDistributed = payrollRuns.reduce((acc, r) => acc + r.totalGross, 0);
  const totalNetDistributed = payrollRuns.reduce((acc, r) => acc + r.totalNet, 0);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/dashboard/hr"
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <ArrowLeftIcon className="h-3.5 w-3.5" /> Back to Employee Master
            </Link>
          </div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <CalculatorIcon className="h-8 w-8 text-emerald-600" />
            Moroccan Payroll &amp; Payslips (Traitement de Paie)
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Automated CNSS, AMO, Frais Professionnels, and IGR tax deductions with automatic General Ledger postings.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <RunPayrollDialog />
        </div>
      </div>

      {payrollRuns.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
          <CalculatorIcon className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <h3 className="font-semibold text-lg text-foreground">No payroll runs executed yet</h3>
          <p className="text-sm mt-1">
            Click &quot;Run Monthly Payroll&quot; to compute deductions and generate employee payslips.
          </p>
        </div>
      ) : (
        payrollRuns.map((run) => (
          <div key={run.id} className="bg-card border border-border rounded-xl shadow-sm overflow-hidden space-y-4 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                  {run.period}
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">
                    Paie du Personnel — {run.period}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {run.payslips.length} Collaborateurs traités • Comptabilisé au Grand Livre (GL Auto-Posted)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs font-semibold">
                <div className="text-right">
                  <span className="text-muted-foreground block text-[10px]">Total Brut</span>
                  <span className="text-foreground">
                    {run.totalGross.toLocaleString("fr-MA", { style: "currency", currency: "MAD" })}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-muted-foreground block text-[10px]">Total Net à Payer</span>
                  <span className="text-emerald-700 font-bold">
                    {run.totalNet.toLocaleString("fr-MA", { style: "currency", currency: "MAD" })}
                  </span>
                </div>
                <Badge variant="default" className="bg-emerald-600">
                  {run.status}
                </Badge>
              </div>
            </div>

            {/* Payslips Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 text-muted-foreground font-medium border-b">
                  <tr>
                    <th className="px-4 py-2.5">Collaborateur</th>
                    <th className="px-4 py-2.5 text-right">Salaire Brut</th>
                    <th className="px-4 py-2.5 text-right">CNSS (4.48%)</th>
                    <th className="px-4 py-2.5 text-right">AMO (2.26%)</th>
                    <th className="px-4 py-2.5 text-right">Frais Pro (35%)</th>
                    <th className="px-4 py-2.5 text-right">Net Imposable (SNI)</th>
                    <th className="px-4 py-2.5 text-right">Retenue IGR</th>
                    <th className="px-4 py-2.5 text-right font-bold text-foreground">Net à Payer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 font-mono">
                  {run.payslips.map((ps) => (
                    <tr key={ps.id} className="hover:bg-muted/20">
                      <td className="px-4 py-2.5 font-sans font-semibold text-foreground">
                        {ps.employee?.firstName} {ps.employee?.lastName}
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold text-foreground">
                        {ps.grossSalary.toLocaleString()} MAD
                      </td>
                      <td className="px-4 py-2.5 text-right text-red-600">
                        -{ps.cnssDeduction.toLocaleString()} MAD
                      </td>
                      <td className="px-4 py-2.5 text-right text-red-600">
                        -{ps.amoDeduction.toLocaleString()} MAD
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-500">
                        ({ps.fraisPro.toLocaleString()} MAD)
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-700">
                        {ps.netTaxable.toLocaleString()} MAD
                      </td>
                      <td className="px-4 py-2.5 text-right text-red-600">
                        -{ps.igrDeduction.toLocaleString()} MAD
                      </td>
                      <td className="px-4 py-2.5 text-right font-sans font-bold text-emerald-700 text-sm">
                        {ps.netSalary.toLocaleString("fr-MA", { style: "currency", currency: "MAD" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
