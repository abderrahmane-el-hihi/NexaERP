import { Badge } from "@/components/ui/badge";
import { ShoppingCartIcon, TruckIcon, DocumentTextIcon } from "@heroicons/react/24/outline";
import { getSalesOrders, getSalesOrderPrerequisites } from "@/modules/sales/services/order.service";
import { ConvertOrderButton } from "@/modules/sales/components/ConvertOrderButton";
import { CreateDeliveryButton } from "@/modules/sales/components/CreateDeliveryButton";
import { NewSalesOrderDialog } from "@/modules/sales/components/NewSalesOrderDialog";
import Link from "next/link";

const STATUS_COLORS: Record<string, string> = {
  Draft: "bg-slate-100 text-slate-700",
  Confirmed: "bg-blue-100 text-blue-700",
  Delivered: "bg-purple-100 text-purple-700",
  Invoiced: "bg-green-100 text-green-700",
  Cancelled: "bg-red-100 text-red-700",
};

export default async function OrdersPage() {
  const [orders, { companies }] = await Promise.all([
    getSalesOrders(),
    getSalesOrderPrerequisites(),
  ]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ShoppingCartIcon className="h-8 w-8 text-primary" />
            Sales Orders (Commandes Clients - CMD)
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Confirmed commercial commitments. Convert to Delivery Notes (BL) or formal legal Invoices (FA).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/sales/delivery"
            className="text-xs font-semibold text-primary hover:underline bg-primary/10 px-3 py-2 rounded-lg border border-primary/20 flex items-center gap-1.5"
          >
            <TruckIcon className="h-3.5 w-3.5" />
            View Delivery Notes (BL) →
          </Link>
          <NewSalesOrderDialog companies={companies} />
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 border-b text-muted-foreground font-medium">
              <tr>
                <th className="px-6 py-4">Order #</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Total Amount (TTC)</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Fulfillment &amp; Invoicing</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    <div className="space-y-2">
                      <p>No sales orders found.</p>
                      <NewSalesOrderDialog companies={companies} />
                    </div>
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const hasDelivery = order.deliveryNotes && order.deliveryNotes.length > 0;
                  const hasInvoice = order.invoices && order.invoices.length > 0;

                  return (
                    <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-mono font-medium text-foreground">
                        {order.number}
                      </td>
                      <td className="px-6 py-4 font-semibold text-foreground">
                        {order.company?.name || "Customer"}
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">
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
                        <div className="flex items-center justify-end gap-2">
                          <CreateDeliveryButton
                            salesOrderId={order.id}
                            hasDelivery={hasDelivery}
                          />

                          {!hasInvoice ? (
                            <ConvertOrderButton orderId={order.id} />
                          ) : (
                            <span className="text-xs text-emerald-700 font-mono bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                              Invoiced: {order.invoices[0]?.number}
                            </span>
                          )}
                        </div>
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
