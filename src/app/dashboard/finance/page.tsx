import { Button } from "@/components/ui/button";
import { ChartBarIcon, ArrowDownTrayIcon, CalculatorIcon, ClockIcon } from "@heroicons/react/24/outline";
import { getAgedReceivables, getTvaSummary } from "@/modules/fi/services/reports.service";

export default async function FinancePage() {
  const today = new Date();
  
  const [tvaSummary, receivables] = await Promise.all([
    getTvaSummary(today.getMonth() + 1, today.getFullYear()),
    getAgedReceivables(),
  ]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ChartBarIcon className="h-6 w-6 text-primary" />
            Finance & Accounting
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">TVA summaries, receivables, and accountant exports.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
            Export Grand Livre
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* TVA Summary */}
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-border flex justify-between items-center bg-muted/30">
            <h2 className="font-semibold flex items-center gap-2">
              <CalculatorIcon className="h-5 w-5 text-blue-500" />
              TVA Summary — {tvaSummary.period}
            </h2>
            <Button variant="ghost" size="sm">Export</Button>
          </div>
          <div className="p-5 flex-1 space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-dashed border-border">
              <span className="text-muted-foreground">TVA Collectée (Ventes)</span>
              <span className="font-medium">{new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(tvaSummary.collected)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-dashed border-border">
              <span className="text-muted-foreground">TVA Déductible (Achats)</span>
              <span className="font-medium">{new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(tvaSummary.deductible)}</span>
            </div>
            <div className="flex justify-between items-center py-2 mt-4 bg-primary/5 p-3 rounded-lg border border-primary/20">
              <span className="font-semibold text-primary">TVA Nette à Payer</span>
              <span className="font-bold text-lg text-primary">{new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(tvaSummary.netPayable)}</span>
            </div>
          </div>
        </div>

        {/* Aged Receivables */}
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-border flex justify-between items-center bg-muted/30">
            <h2 className="font-semibold flex items-center gap-2">
              <ClockIcon className="h-5 w-5 text-amber-500" />
              Aged Receivables (Créances)
            </h2>
            <Button variant="ghost" size="sm">Details</Button>
          </div>
          <div className="p-0 flex-1 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Client</th>
                  <th className="px-4 py-2 text-right font-medium">Current</th>
                  <th className="px-4 py-2 text-right font-medium text-amber-600">1-30d</th>
                  <th className="px-4 py-2 text-right font-medium text-red-500">30d+</th>
                  <th className="px-4 py-2 text-right font-medium">Total Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {receivables.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No open balances</td>
                  </tr>
                ) : (
                  receivables.map((r: any, idx: number) => (
                    <tr key={idx} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium truncate max-w-[120px]">{r.companyName}</td>
                      <td className="px-4 py-3 text-right">{r.current > 0 ? r.current.toLocaleString('fr-MA') : '-'}</td>
                      <td className="px-4 py-3 text-right text-amber-600">{r.days30 > 0 ? r.days30.toLocaleString('fr-MA') : '-'}</td>
                      <td className="px-4 py-3 text-right text-red-500">{(r.days60 + r.days90Plus) > 0 ? (r.days60 + r.days90Plus).toLocaleString('fr-MA') : '-'}</td>
                      <td className="px-4 py-3 text-right font-bold">{r.totalDue.toLocaleString('fr-MA')}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
