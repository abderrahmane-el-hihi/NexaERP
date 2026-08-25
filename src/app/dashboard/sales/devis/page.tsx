import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DocumentTextIcon, PlusIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { getDevis } from "@/modules/sales/services/devis.service";
import { ConvertDevisButton } from "@/modules/sales/components/ConvertDevisButton";
import { ConvertDevisToInvoiceButton } from "@/modules/sales/components/ConvertDevisToInvoiceButton";
import { DownloadDevisButton } from "@/modules/sales/components/DownloadDevisButton";

const STATUS_COLORS: Record<string, string> = {
  Draft: "bg-slate-100 text-slate-700",
  Sent: "bg-blue-100 text-blue-700",
  Accepted: "bg-green-100 text-green-700",
  Refused: "bg-red-100 text-red-700",
  Converted: "bg-purple-100 text-purple-700",
};

export default async function DevisPage() {
  const devisList = await getDevis();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <DocumentTextIcon className="h-6 w-6 text-primary" />
            Devis (Quotes)
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">Create and track commercial proposals.</p>
        </div>
        <Link href="/dashboard/sales/devis/new">
          <Button size="sm">
            <PlusIcon className="h-4 w-4 mr-1" />
            New Devis
          </Button>
        </Link>
      </div>

      {/* Status filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {["All", "Draft", "Sent", "Accepted", "Refused", "Converted"].map((s, i) => (
          <button
            key={s}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              i === 0
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border hover:bg-accent"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="border border-border rounded-xl overflow-hidden shadow-sm bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="px-5 py-3 text-left font-medium text-muted-foreground">Number</th>
              <th className="px-5 py-3 text-left font-medium text-muted-foreground">Company</th>
              <th className="px-5 py-3 text-left font-medium text-muted-foreground">Date</th>
              <th className="px-5 py-3 text-left font-medium text-muted-foreground">Valid Until</th>
              <th className="px-5 py-3 text-right font-medium text-muted-foreground">Total TTC</th>
              <th className="px-5 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-5 py-3 text-right font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {devisList.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-16 text-center">
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <DocumentTextIcon className="h-10 w-10 opacity-20" />
                    <p className="font-medium">No devis yet</p>
                    <p className="text-xs">Create your first commercial quote.</p>
                    <Link href="/dashboard/sales/devis/new" className="mt-1">
                      <Button size="sm">
                        <PlusIcon className="h-4 w-4 mr-1" />
                        New Devis
                      </Button>
                    </Link>
                  </div>
                </td>
              </tr>
            ) : (
              devisList.map(d => (
                <tr key={d.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                  <td className="px-5 py-3 font-medium">{d.number}</td>
                  <td className="px-5 py-3">{d.company?.name}</td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {new Intl.DateTimeFormat('fr-FR').format(new Date(d.date))}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {d.validUntil ? new Intl.DateTimeFormat('fr-FR').format(new Date(d.validUntil)) : "-"}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold">
                    {new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(d.total)}
                  </td>
                  <td className="px-5 py-3">
                    <Badge className={STATUS_COLORS[d.status] || STATUS_COLORS["Draft"]} variant="secondary">
                      {d.status}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-right space-x-2">
                    <div className="flex items-center justify-end gap-1">
                      <DownloadDevisButton devis={d} />
                      {d.status !== "Converted" && (
                        <>
                          <ConvertDevisButton devisId={d.id} />
                          <ConvertDevisToInvoiceButton devisId={d.id} />
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
