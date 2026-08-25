import { Badge } from "@/components/ui/badge";
import { getCreditNotes } from "@/modules/sales/services/credit-note.service";
import { ArrowUturnLeftIcon, ArrowLeftIcon, ShieldExclamationIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

export default async function CreditNotesPage() {
  const creditNotes = await getCreditNotes();

  const totalAvoirs = creditNotes.reduce((acc, c) => acc + c.total, 0);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/dashboard/sales/invoices"
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <ArrowLeftIcon className="h-3.5 w-3.5" /> Back to Invoices
            </Link>
          </div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2 text-red-950">
            <ArrowUturnLeftIcon className="h-8 w-8 text-red-600" />
            Credit Notes (Factures d'Avoir - AV)
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Legal reversal documents under Moroccan tax law. Each Avoir legally cancels the client receivable and auto-reverses General Ledger revenue.
          </p>
        </div>

        <div className="bg-card border rounded-xl p-3 px-4 shadow-xs text-right">
          <p className="text-[11px] text-muted-foreground">Total Avoirs Issued</p>
          <p className="text-base font-bold text-red-600">
            {totalAvoirs.toLocaleString("fr-MA", { style: "currency", currency: "MAD" })}
          </p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 border-b text-muted-foreground font-medium">
              <tr>
                <th className="px-6 py-4">Avoir #</th>
                <th className="px-6 py-4">Original Invoice #</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Issue Date</th>
                <th className="px-6 py-4">Reason / Motif</th>
                <th className="px-6 py-4">Total Amount (TTC)</th>
                <th className="px-6 py-4 text-right">Accounting Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {creditNotes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                    No credit notes issued yet. Go to Invoices and click "Issue Avoir" on a finalized invoice.
                  </td>
                </tr>
              ) : (
                creditNotes.map((cn) => (
                  <tr key={cn.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-red-600">
                      {cn.number}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                      {cn.invoice?.number || "—"}
                    </td>
                    <td className="px-6 py-4 font-semibold text-foreground">
                      {cn.company?.name || "Customer"}
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">
                      {new Date(cn.date).toLocaleDateString("fr-MA")}
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground max-w-xs">
                      {cn.reason || "Avoir standard"}
                    </td>
                    <td className="px-6 py-4 font-semibold text-red-600">
                      -{cn.total.toLocaleString("fr-MA", {
                        style: "currency",
                        currency: "MAD",
                      })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Badge variant="default" className="bg-emerald-600">
                        GL Reversed (Posted)
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
