import { Badge } from "@/components/ui/badge";
import { getDeliveryNotes } from "@/modules/sales/services/delivery-note.service";
import { TruckIcon, ArrowLeftIcon, CheckBadgeIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

export default async function DeliveryNotesPage() {
  const notes = await getDeliveryNotes();

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/dashboard/sales/orders"
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <ArrowLeftIcon className="h-3.5 w-3.5" /> Back to Sales Orders
            </Link>
          </div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <TruckIcon className="h-8 w-8 text-primary" />
            Delivery Notes (Bons de Livraison - BL)
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Fulfillment documentation. Issuing a BL automatically updates warehouse inventory via audited StockMovements (OUT).
          </p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 border-b text-muted-foreground font-medium">
              <tr>
                <th className="px-6 py-4">BL #</th>
                <th className="px-6 py-4">Sales Order #</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Delivery Date</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Inventory Impact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {notes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    No delivery notes generated yet. Go to Sales Orders and click &quot;Issue Delivery (BL)&quot;.
                  </td>
                </tr>
              ) : (
                notes.map((note) => (
                  <tr key={note.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-foreground">
                      {note.number}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                      {note.salesOrder?.number || "—"}
                    </td>
                    <td className="px-6 py-4 font-semibold text-foreground">
                      {note.salesOrder?.company?.name || "Customer"}
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">
                      {new Date(note.date).toLocaleDateString("fr-MA")}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="default" className="bg-blue-600">
                        {note.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-medium bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                        <CheckBadgeIcon className="h-3.5 w-3.5" /> Stock Decremented
                      </span>
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
