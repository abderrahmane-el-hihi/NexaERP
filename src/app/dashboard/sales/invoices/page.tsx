import { Badge } from "@/components/ui/badge";
import { ReceiptRefundIcon, DocumentArrowDownIcon, LockClosedIcon, ArrowUturnLeftIcon } from "@heroicons/react/24/outline";
import { getInvoices } from "@/modules/sales/services/invoice.service";
import { DownloadInvoiceButton } from "@/modules/sales/components/DownloadInvoiceButton";
import { FinalizeInvoiceButton } from "@/modules/sales/components/FinalizeInvoiceButton";
import { CreateCreditNoteDialog } from "@/modules/sales/components/CreateCreditNoteDialog";
import Link from "next/link";

const STATUS_COLORS: Record<string, string> = {
  Draft: "bg-slate-100 text-slate-700",
  Finalized: "bg-amber-100 text-amber-700",
  Sent: "bg-blue-100 text-blue-700",
  Paid: "bg-green-100 text-green-700",
  Overdue: "bg-red-100 text-red-700",
  Cancelled: "bg-slate-200 text-slate-800 line-through",
};

export default async function InvoicesPage() {
  const invoices = await getInvoices();

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ReceiptRefundIcon className="h-8 w-8 text-primary" />
            Invoices (Factures de Vente - FA)
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gapless sequential numbering and post-finalization immutability under Moroccan Article 145 CGI.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/sales/credit-notes"
            className="text-xs font-semibold text-red-700 hover:underline bg-red-50 px-3 py-2 rounded-lg border border-red-200 flex items-center gap-1.5"
          >
            <ArrowUturnLeftIcon className="h-3.5 w-3.5" />
            View Credit Notes (Avoirs) →
          </Link>
        </div>
      </div>

      <div className="border border-border rounded-xl overflow-hidden shadow-sm bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Invoice #</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Company</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Date</th>
                <th className="px-5 py-3 text-right font-medium text-muted-foreground">Amount Due</th>
                <th className="px-5 py-3 text-right font-medium text-muted-foreground">Total TTC</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-5 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <ReceiptRefundIcon className="h-10 w-10 opacity-20" />
                      <p className="font-medium">No invoices yet</p>
                      <p className="text-xs">Convert an order to an invoice.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                    <td className="px-5 py-3 font-medium flex items-center gap-1.5 font-mono">
                      {["Finalized", "Sent", "Paid", "Overdue"].includes(inv.status) && (
                        <span title="Immutable Document">
                          <LockClosedIcon className="h-3.5 w-3.5 text-amber-500" />
                        </span>
                      )}
                      {inv.number}
                    </td>
                    <td className="px-5 py-3 font-semibold">{inv.company?.name}</td>
                    <td className="px-5 py-3 text-muted-foreground text-xs">
                      {new Intl.DateTimeFormat("fr-FR").format(new Date(inv.date))}
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-amber-600">
                      {new Intl.NumberFormat("fr-MA", { style: "currency", currency: "MAD" }).format(inv.amountDue)}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold">
                      {new Intl.NumberFormat("fr-MA", { style: "currency", currency: "MAD" }).format(inv.total)}
                    </td>
                    <td className="px-5 py-3">
                      <Badge className={STATUS_COLORS[inv.status] || STATUS_COLORS["Draft"]} variant="secondary">
                        {inv.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {inv.status === "Draft" && <FinalizeInvoiceButton invoiceId={inv.id} />}
                        {["Finalized", "Sent", "Paid", "Overdue"].includes(inv.status) && (
                          <CreateCreditNoteDialog invoice={inv} />
                        )}
                        <DownloadInvoiceButton invoice={inv} />
                      </div>
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
