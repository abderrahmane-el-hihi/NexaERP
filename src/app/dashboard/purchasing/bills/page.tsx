import { Badge } from "@/components/ui/badge";
import { getSupplierBills } from "@/modules/purchasing/services/purchase-order.service";
import { PaySupplierBillDialog } from "@/modules/purchasing/components/PaySupplierBillDialog";
import { DocumentTextIcon, ArrowLeftIcon, BuildingLibraryIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

export default async function SupplierBillsPage() {
  const bills = await getSupplierBills();

  const totalPayables = bills.reduce((acc, b) => acc + b.amountDue, 0);
  const totalPaid = bills.reduce((acc, b) => acc + b.amountPaid, 0);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/dashboard/purchasing/orders"
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <ArrowLeftIcon className="h-3.5 w-3.5" /> Back to Purchase Orders
            </Link>
          </div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <DocumentTextIcon className="h-8 w-8 text-primary" />
            Accounts Payable &amp; Supplier Bills (AP)
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track vendor invoices (*Factures Fournisseurs*), Moroccan payment deadlines, and disbursement settlements.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-card border rounded-xl p-3 px-4 shadow-xs text-right">
            <p className="text-[11px] text-muted-foreground">Outstanding Payables</p>
            <p className="text-base font-bold text-amber-700">
              {totalPayables.toLocaleString("fr-MA", { style: "currency", currency: "MAD" })}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 border-b text-muted-foreground font-medium">
              <tr>
                <th className="px-6 py-4">Bill #</th>
                <th className="px-6 py-4">Supplier</th>
                <th className="px-6 py-4">Linked PO</th>
                <th className="px-6 py-4">Bill Date</th>
                <th className="px-6 py-4">Total Amount (TTC)</th>
                <th className="px-6 py-4">Due Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Settlement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {bills.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                    No supplier bills recorded yet. Create a Purchase Order and click &quot;Generate Bill&quot; after receiving goods.
                  </td>
                </tr>
              ) : (
                bills.map((bill) => (
                  <tr key={bill.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-mono font-medium text-foreground">
                      {bill.number}
                    </td>
                    <td className="px-6 py-4 font-semibold text-foreground">
                      {bill.company?.name || "Supplier"}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                      {bill.purchaseOrder?.number || "—"}
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">
                      {new Date(bill.date).toLocaleDateString("fr-MA")}
                    </td>
                    <td className="px-6 py-4 font-semibold text-foreground">
                      {bill.total.toLocaleString("fr-MA", {
                        style: "currency",
                        currency: "MAD",
                      })}
                    </td>
                    <td className="px-6 py-4 font-semibold text-amber-700">
                      {bill.amountDue.toLocaleString("fr-MA", {
                        style: "currency",
                        currency: "MAD",
                      })}
                    </td>
                    <td className="px-6 py-4">
                      {bill.status === "Paid" ? (
                        <Badge variant="default" className="bg-emerald-600">
                          Paid
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                          Unpaid (AP)
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {bill.status !== "Paid" && <PaySupplierBillDialog bill={bill} />}
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
