import { Badge } from "@/components/ui/badge";
import { ShoppingCartIcon, DocumentTextIcon, ArrowRightIcon } from "@heroicons/react/24/outline";
import { getPurchaseOrders } from "@/modules/purchasing/services/purchase-order.service";
import { getCompanies } from "@/modules/crm/services/company.service";
import { getProducts } from "@/modules/catalog/services/product.service";
import { NewPurchaseOrderDialog } from "@/modules/purchasing/components/NewPurchaseOrderDialog";
import { PurchaseOrderActions } from "@/modules/purchasing/components/PurchaseOrderActions";
import Link from "next/link";

const STATUS_COLORS: Record<string, string> = {
  Draft: "bg-slate-100 text-slate-700",
  Sent: "bg-blue-100 text-blue-700",
  Confirmed: "bg-amber-100 text-amber-700",
  Received: "bg-green-100 text-green-700",
  Cancelled: "bg-red-100 text-red-700",
};

export default async function PurchaseOrdersPage() {
  const [orders, companies, products] = await Promise.all([
    getPurchaseOrders(),
    getCompanies(),
    getProducts(),
  ]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ShoppingCartIcon className="h-8 w-8 text-primary" />
            Purchase Orders (MM-PUR)
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Procurement workflow: Requisition → PO (BC) → Goods Receipt (BR) → 3-Way Match Bill (FF).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/purchasing/bills"
            className="text-xs font-semibold text-primary hover:underline bg-primary/10 px-3 py-2 rounded-lg border border-primary/20"
          >
            View Supplier Bills (AP) →
          </Link>
          <NewPurchaseOrderDialog companies={companies} products={products} />
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 border-b text-muted-foreground font-medium">
              <tr>
                <th className="px-6 py-4">PO #</th>
                <th className="px-6 py-4">Supplier</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Total Amount (TTC)</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Fulfillment / 3-Way Match</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    No purchase orders found. Click &quot;Create Purchase Order&quot; to get started.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-mono font-medium text-foreground">
                      {order.number}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <span className="font-semibold">{order.company?.name || "Supplier"}</span>
                        {order.company?.ICE && (
                          <p className="text-[11px] text-muted-foreground font-mono">
                            ICE: {order.company.ICE}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground text-xs">
                      {new Date(order.date).toLocaleDateString("fr-MA")}
                    </td>
                    <td className="px-6 py-4 font-semibold text-foreground">
                      {order.total.toLocaleString("fr-MA", {
                        style: "currency",
                        currency: "MAD",
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant="secondary"
                        className={STATUS_COLORS[order.status] || "bg-slate-100 text-slate-700"}
                      >
                        {order.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <PurchaseOrderActions order={order} />
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
