import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getJournalEntries } from "@/modules/fi/services/ledger.service";

export default async function LedgerPage() {
  const entries = await getJournalEntries();

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">General Ledger</h1>
          <p className="text-muted-foreground mt-2">
            View all accounting journal entries and double-entry records (FI-GL).
          </p>
        </div>
        <Button>
          New Manual Entry
        </Button>
      </div>

      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-4">Entry #</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4">Source</th>
                <th className="px-6 py-4 text-right">Debit</th>
                <th className="px-6 py-4 text-right">Credit</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    No journal entries found. Accounting transactions will appear here.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => {
                  const totalDebit: number = entry.lines.reduce((sum, line) => sum + Number(line.debit), 0 as number);
                  const totalCredit: number = entry.lines.reduce((sum, line) => sum + Number(line.credit), 0 as number);

                  return (
                    <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900">
                        {entry.number}
                      </td>
                      <td className="px-6 py-4">
                        {new Date(entry.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        {entry.description}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline">{entry.sourceType || "Manual"}</Badge>
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-blue-600">
                        {totalDebit.toLocaleString("fr-MA", { style: "currency", currency: "MAD" })}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-amber-600">
                        {totalCredit.toLocaleString("fr-MA", { style: "currency", currency: "MAD" })}
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          variant="secondary"
                          className={entry.status === "Posted" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-700"}
                        >
                          {entry.status}
                        </Badge>
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
