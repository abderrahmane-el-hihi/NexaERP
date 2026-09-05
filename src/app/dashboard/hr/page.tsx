import { Badge } from "@/components/ui/badge";
import { getEmployees } from "@/modules/hr/services/payroll.service";
import { calculateMoroccanPayroll } from "@/modules/hr/utils/payroll-calculator";
import { NewEmployeeDialog } from "@/modules/hr/components/NewEmployeeDialog";
import { UsersIcon, BriefcaseIcon, CalculatorIcon, ArrowRightIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

export default async function HRPage() {
  const employees = await getEmployees();

  const totalGrossPayroll = employees.reduce((acc, e) => acc + e.baseSalary, 0);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <UsersIcon className="h-8 w-8 text-primary" />
            Human Resources &amp; Employee Master (HCM)
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage employee contracts, Moroccan CNSS affiliations, and compensation structures.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/hr/payroll"
            className="text-xs font-semibold text-primary hover:underline bg-primary/10 px-3.5 py-2 rounded-lg border border-primary/20 flex items-center gap-1.5"
          >
            <CalculatorIcon className="h-4 w-4" />
            Payroll &amp; Payslips (Bulletins de Paie) →
          </Link>
          <NewEmployeeDialog />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
          <p className="text-xs text-muted-foreground">Active Staff Count</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{employees.length} Employees</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
          <p className="text-xs text-muted-foreground">Total Monthly Gross Payroll</p>
          <p className="text-xl font-bold text-emerald-700 mt-1">
            {totalGrossPayroll.toLocaleString("fr-MA", { style: "currency", currency: "MAD" })}
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
          <p className="text-xs text-muted-foreground">Moroccan Social Regime</p>
          <p className="text-sm font-semibold text-slate-700 mt-1">
            CNSS + AMO Standard Compliant
          </p>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 border-b text-muted-foreground font-medium">
              <tr>
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">Department &amp; Title</th>
                <th className="px-6 py-4">CIN &amp; CNSS</th>
                <th className="px-6 py-4">Contract</th>
                <th className="px-6 py-4">Base Gross (MAD)</th>
                <th className="px-6 py-4 text-right">Est. Net Take-Home</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    No employees registered yet. Click &quot;Add Employee&quot; to get started.
                  </td>
                </tr>
              ) : (
                employees.map((emp) => {
                  const payrollCalc = calculateMoroccanPayroll(emp.baseSalary);

                  return (
                    <tr key={emp.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0">
                            {emp.firstName.charAt(0)}
                            {emp.lastName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">
                              {emp.firstName} {emp.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">{emp.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-foreground">{emp.jobTitle}</p>
                        <p className="text-xs text-muted-foreground">{emp.department || "General"}</p>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                        <div>CIN: {emp.cin || "—"}</div>
                        <div>CNSS: {emp.cnssNumber || "—"}</div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className="font-mono text-xs">
                          {emp.contractType}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 font-semibold text-foreground">
                        {emp.baseSalary.toLocaleString("fr-MA", {
                          style: "currency",
                          currency: "MAD",
                        })}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-emerald-700">
                        {payrollCalc.netSalary.toLocaleString("fr-MA", {
                          style: "currency",
                          currency: "MAD",
                        })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
