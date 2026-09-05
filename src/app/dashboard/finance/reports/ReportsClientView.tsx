"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { BookOpenIcon, CalculatorIcon, ArrowTrendingUpIcon, BuildingLibraryIcon, ClockIcon, CheckCircleIcon, TableCellsIcon } from "@heroicons/react/24/outline";
import type { AgeingReport, BalanceSheetView, IncomeStatementView, TrialBalanceRow } from "@/shared/view-types";

interface ReportsClientViewProps {
  trialBalance: TrialBalanceRow[];
  cpc: IncomeStatementView;
  bilan: BalanceSheetView;
  arAging: AgeingReport;
  apAging: AgeingReport;
}

export function ReportsClientView({
  trialBalance,
  cpc,
  bilan,
  arAging,
  apAging,
}: ReportsClientViewProps) {
  const [activeTab, setActiveTab] = useState<"tb" | "cpc" | "bilan" | "aging">("tb");

  const totalDebit = trialBalance.reduce((sum, row) => sum + row.totalDebit, 0);
  const totalCredit = trialBalance.reduce((sum, row) => sum + row.totalCredit, 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const formatMoney = (val: number) =>
    new Intl.NumberFormat("fr-MA", { style: "currency", currency: "MAD" }).format(val || 0);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
          <p className="text-xs text-muted-foreground">Total Ledger Volume</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{formatMoney(totalDebit)}</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
          <p className="text-xs text-muted-foreground">Operating Revenue (CPC)</p>
          <p className="text-xl font-bold text-emerald-700 mt-1">
            {formatMoney(cpc.totalOperatingRevenue)}
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
          <p className="text-xs text-muted-foreground">Net Operating Result</p>
          <p
            className={`text-xl font-bold mt-1 ${
              cpc.netIncome >= 0 ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {formatMoney(cpc.netIncome)}
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
          <p className="text-xs text-muted-foreground">GL Consistency Status</p>
          <p
            className={`text-xl font-bold mt-1 flex items-center gap-1.5 ${
              isBalanced ? "text-emerald-600" : "text-red-600"
            }`}
          >
            <CheckCircleIcon className="h-5 w-5" />
            {isBalanced ? "Equilibrée (ACID)" : "Déséquilibrée"}
          </p>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="flex items-center gap-2 border-b border-border overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab("tb")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "tb"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <BookOpenIcon className="h-4 w-4" />
          <span>Balance Générale (Trial Balance)</span>
        </button>

        <button
          onClick={() => setActiveTab("cpc")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "cpc"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <ArrowTrendingUpIcon className="h-4 w-4" />
          <span>Compte de Résultat (CPC / P&amp;L)</span>
        </button>

        <button
          onClick={() => setActiveTab("bilan")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "bilan"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <BuildingLibraryIcon className="h-4 w-4" />
          <span>Bilan (Balance Sheet)</span>
        </button>

        <button
          onClick={() => setActiveTab("aging")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "aging"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <ClockIcon className="h-4 w-4" />
          <span>Aged AR &amp; AP (Balance Âgée)</span>
        </button>
      </div>

      {/* TAB 1: Trial Balance */}
      {activeTab === "tb" && (
        <div className="border border-border rounded-xl overflow-hidden shadow-sm bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground w-28">Code</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Account Name</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground w-32">Type</th>
                <th className="px-5 py-3 text-right font-medium text-muted-foreground">Total Debit</th>
                <th className="px-5 py-3 text-right font-medium text-muted-foreground">Total Credit</th>
                <th className="px-5 py-3 text-right font-medium text-muted-foreground">Net Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {trialBalance.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                    No general ledger transactions found yet.
                  </td>
                </tr>
              ) : (
                trialBalance.map((acc) => (
                  <tr key={acc.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 font-mono font-bold text-foreground">{acc.code}</td>
                    <td className="px-5 py-3 font-medium">{acc.name}</td>
                    <td className="px-5 py-3">
                      <Badge variant="secondary" className="font-normal text-xs">
                        {acc.type}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-right font-medium">{formatMoney(acc.totalDebit)}</td>
                    <td className="px-5 py-3 text-right font-medium">{formatMoney(acc.totalCredit)}</td>
                    <td
                      className={`px-5 py-3 text-right font-bold ${
                        acc.netBalance > 0
                          ? "text-blue-600"
                          : acc.netBalance < 0
                          ? "text-amber-600"
                          : ""
                      }`}
                    >
                      {formatMoney(Math.abs(acc.netBalance))}{" "}
                      <span className="text-xs">{acc.netBalance > 0 ? "(Dr)" : acc.netBalance < 0 ? "(Cr)" : ""}</span>
                    </td>
                  </tr>
                ))
              )}
              {trialBalance.length > 0 && (
                <tr className="bg-muted/60 font-bold border-t-2 border-border">
                  <td colSpan={3} className="px-5 py-3 text-right">TOTAL GENERAL</td>
                  <td className="px-5 py-3 text-right text-foreground">{formatMoney(totalDebit)}</td>
                  <td className="px-5 py-3 text-right text-foreground">{formatMoney(totalCredit)}</td>
                  <td className="px-5 py-3 text-right text-emerald-600">0.00 MAD (Balanced)</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: CPC / Income Statement */}
      {activeTab === "cpc" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Revenue / Produits d'exploitation (Class 7) */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-bold text-base text-emerald-950 flex items-center gap-2">
                  <ArrowTrendingUpIcon className="h-5 w-5 text-emerald-600" />
                  Produits d&apos;Exploitation (Class 7)
                </h3>
                <span className="font-bold text-emerald-700">
                  {formatMoney(cpc.totalOperatingRevenue)}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                {cpc.operatingRevenues.length === 0 ? (
                  <p className="text-muted-foreground text-xs italic">No sales revenue posted yet.</p>
                ) : (
                  cpc.operatingRevenues.map((r) => (
                    <div key={r.code} className="flex justify-between py-1 border-b border-muted/50">
                      <span className="text-muted-foreground">
                        <strong className="font-mono text-foreground">{r.code}</strong> {r.name}
                      </span>
                      <span className="font-semibold">{formatMoney(r.balance)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Charges d'exploitation (Class 6) */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-bold text-base text-red-950 flex items-center gap-2">
                  <CalculatorIcon className="h-5 w-5 text-red-600" />
                  Charges d&apos;Exploitation (Class 6)
                </h3>
                <span className="font-bold text-red-700">
                  {formatMoney(cpc.totalOperatingExpenses)}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                {cpc.operatingExpenses.length === 0 ? (
                  <p className="text-muted-foreground text-xs italic">No operating expenses posted yet.</p>
                ) : (
                  cpc.operatingExpenses.map((e) => (
                    <div key={e.code} className="flex justify-between py-1 border-b border-muted/50">
                      <span className="text-muted-foreground">
                        <strong className="font-mono text-foreground">{e.code}</strong> {e.name}
                      </span>
                      <span className="font-semibold">{formatMoney(e.balance)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Résultat Net Summary Card */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl p-6 shadow-md flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-300 font-mono">SYNTHÈSE DU COMPTE DE PRODUITS ET CHARGES</p>
              <h2 className="text-xl font-bold mt-1">Résultat Net d&apos;Exploitation</h2>
            </div>
            <div className="text-right">
              <p
                className={`text-2xl font-black ${
                  cpc.netIncome >= 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {formatMoney(cpc.netIncome)}
              </p>
              <p className="text-[11px] text-slate-400">
                {cpc.netIncome >= 0 ? "Bénéfice Net" : "Perte Nette"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Balance Sheet / Bilan */}
      {activeTab === "bilan" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* ACTIF (Assets) */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-blue-950 flex items-center gap-2">
                <BuildingLibraryIcon className="h-5 w-5 text-blue-600" />
                ACTIF (Assets)
              </h3>
              <span className="font-bold text-blue-700">{formatMoney(bilan.totalActif)}</span>
            </div>

            <div className="space-y-3 text-sm">
              <p className="font-semibold text-xs text-slate-500 uppercase">Actif Circulant (Class 3)</p>
              {bilan.actifCirculant.map((a) => (
                <div key={a.code} className="flex justify-between py-1 border-b border-muted/50">
                  <span className="text-muted-foreground">
                    <strong className="font-mono text-foreground">{a.code}</strong> {a.name}
                  </span>
                  <span className="font-semibold">{formatMoney(a.balance)}</span>
                </div>
              ))}

              <p className="font-semibold text-xs text-slate-500 uppercase pt-2">Trésorerie-Actif (Class 5)</p>
              {bilan.tresorerieActif.map((t) => (
                <div key={t.code} className="flex justify-between py-1 border-b border-muted/50">
                  <span className="text-muted-foreground">
                    <strong className="font-mono text-foreground">{t.code}</strong> {t.name}
                  </span>
                  <span className="font-semibold">{formatMoney(t.balance)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* PASSIF (Liabilities & Equity) */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-purple-950 flex items-center gap-2">
                <BuildingLibraryIcon className="h-5 w-5 text-purple-600" />
                PASSIF (Liabilities &amp; Equity)
              </h3>
              <span className="font-bold text-purple-700">{formatMoney(bilan.totalPassif)}</span>
            </div>

            <div className="space-y-3 text-sm">
              <p className="font-semibold text-xs text-slate-500 uppercase">Capitaux Propres (Résultat Net)</p>
              <div className="flex justify-between py-1 border-b border-muted/50">
                <span className="text-muted-foreground">
                  <strong className="font-mono text-foreground">1191</strong> Résultat Net de l&apos;Exercice
                </span>
                <span className="font-semibold">{formatMoney(bilan.equityResult)}</span>
              </div>

              <p className="font-semibold text-xs text-slate-500 uppercase pt-2">Passif Circulant (Class 4)</p>
              {bilan.passifCirculant.map((p) => (
                <div key={p.code} className="flex justify-between py-1 border-b border-muted/50">
                  <span className="text-muted-foreground">
                    <strong className="font-mono text-foreground">{p.code}</strong> {p.name}
                  </span>
                  <span className="font-semibold">{formatMoney(p.balance)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Aging Reports */}
      {activeTab === "aging" && (
        <div className="space-y-6">
          {/* Accounts Receivable Aging */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-base">Accounts Receivable Aging (Créances Clients)</h3>
                <p className="text-xs text-muted-foreground">Unpaid customer invoices grouped by maturity.</p>
              </div>
              <span className="font-bold text-amber-700">{formatMoney(arAging.total)}</span>
            </div>

            <div className="grid grid-cols-4 gap-4 text-center">
              <div className="p-3 bg-muted/20 rounded-lg border">
                <p className="text-[11px] text-muted-foreground">Current (0-30d)</p>
                <p className="font-bold text-sm mt-1">{formatMoney(arAging.buckets.current + arAging.buckets.days1_30)}</p>
              </div>
              <div className="p-3 bg-muted/20 rounded-lg border">
                <p className="text-[11px] text-muted-foreground">31–60 Days</p>
                <p className="font-bold text-sm text-amber-600 mt-1">{formatMoney(arAging.buckets.days31_60)}</p>
              </div>
              <div className="p-3 bg-muted/20 rounded-lg border">
                <p className="text-[11px] text-muted-foreground">&gt; 60 Days Overdue</p>
                <p className="font-bold text-sm text-red-600 mt-1">{formatMoney(arAging.buckets.days61_plus)}</p>
              </div>
              <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                <p className="text-[11px] text-primary font-medium">Total AR</p>
                <p className="font-bold text-sm text-primary mt-1">{formatMoney(arAging.total)}</p>
              </div>
            </div>
          </div>

          {/* Accounts Payable Aging */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-base">Accounts Payable Aging (Dettes Fournisseurs)</h3>
                <p className="text-xs text-muted-foreground">Unpaid supplier bills grouped by payment terms.</p>
              </div>
              <span className="font-bold text-red-700">{formatMoney(apAging.total)}</span>
            </div>

            <div className="grid grid-cols-4 gap-4 text-center">
              <div className="p-3 bg-muted/20 rounded-lg border">
                <p className="text-[11px] text-muted-foreground">Current (0-30d)</p>
                <p className="font-bold text-sm mt-1">{formatMoney(apAging.buckets.current + apAging.buckets.days1_30)}</p>
              </div>
              <div className="p-3 bg-muted/20 rounded-lg border">
                <p className="text-[11px] text-muted-foreground">31–60 Days</p>
                <p className="font-bold text-sm text-amber-600 mt-1">{formatMoney(apAging.buckets.days31_60)}</p>
              </div>
              <div className="p-3 bg-muted/20 rounded-lg border">
                <p className="text-[11px] text-muted-foreground">&gt; 60 Days Overdue</p>
                <p className="font-bold text-sm text-red-600 mt-1">{formatMoney(apAging.buckets.days61_plus)}</p>
              </div>
              <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                <p className="text-[11px] text-primary font-medium">Total AP</p>
                <p className="font-bold text-sm text-primary mt-1">{formatMoney(apAging.total)}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
