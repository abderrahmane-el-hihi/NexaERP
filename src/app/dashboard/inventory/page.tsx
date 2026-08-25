import { MagnifyingGlassIcon, ArrowsUpDownIcon, ExclamationTriangleIcon, Square3Stack3DIcon } from "@heroicons/react/24/outline";
import { getStockLevels } from "@/modules/inv/services/stock.service";
import { getStockAdjustmentPrerequisites } from "@/modules/inv/services/stock-adjustment.service";
import { StockAdjustmentDialog } from "@/modules/inv/components/StockAdjustmentDialog";

export default async function InventoryPage() {
  const [stockLevels, { products, warehouses }] = await Promise.all([
    getStockLevels(),
    getStockAdjustmentPrerequisites(),
  ]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Square3Stack3DIcon className="h-8 w-8 text-primary" />
            Inventory &amp; Warehouses (Stock INV)
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Real-time multi-warehouse stock levels driven by an append-only stock movement ledger.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <StockAdjustmentDialog products={products} warehouses={warehouses} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Total Unique Items</p>
            <p className="text-xl font-bold mt-1 text-foreground">{stockLevels.length} SKUs</p>
          </div>
          <MagnifyingGlassIcon className="h-7 w-7 text-blue-500 opacity-60" />
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Low Stock Alerts</p>
            <p className="text-xl font-bold mt-1 text-red-600">
              {stockLevels.filter((s) => s.quantity <= 5).length} Items
            </p>
          </div>
          <ExclamationTriangleIcon className="h-7 w-7 text-red-500 opacity-60" />
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Active Warehouses</p>
            <p className="text-xl font-bold mt-1 text-slate-800">
              {warehouses.length} Locations
            </p>
          </div>
          <Square3Stack3DIcon className="h-7 w-7 text-emerald-500 opacity-60" />
        </div>
      </div>

      <div className="border border-border rounded-xl overflow-hidden shadow-sm bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Product</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground font-mono text-xs">Reference</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Warehouse</th>
                <th className="px-5 py-3 text-right font-medium text-muted-foreground">Current Qty</th>
                <th className="px-5 py-3 text-center font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {stockLevels.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <MagnifyingGlassIcon className="h-10 w-10 opacity-20" />
                      <p className="font-medium">No stock data yet</p>
                      <p className="text-xs">
                        Stock is automatically updated when receiving purchase orders (BR), delivering sales (BL), or via manual adjustments.
                      </p>
                      <div className="mt-2">
                        <StockAdjustmentDialog products={products} warehouses={warehouses} />
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                stockLevels.map((s) => (
                  <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                    <td className="px-5 py-3 font-semibold text-foreground">{s.product?.name}</td>
                    <td className="px-5 py-3 text-muted-foreground font-mono text-xs">{s.product?.reference || "-"}</td>
                    <td className="px-5 py-3">{s.warehouse?.name}</td>
                    <td className="px-5 py-3 text-right font-mono font-bold text-foreground">{s.quantity}</td>
                    <td className="px-5 py-3 text-center">
                      {s.quantity <= 0 ? (
                        <span className="inline-flex items-center gap-1.5 py-0.5 px-2 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          <ExclamationTriangleIcon className="h-3 w-3" /> Out of stock
                        </span>
                      ) : s.quantity <= 5 ? (
                        <span className="inline-flex items-center gap-1.5 py-0.5 px-2 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                          <ExclamationTriangleIcon className="h-3 w-3" /> Low stock
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 py-0.5 px-2 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                          In stock
                        </span>
                      )}
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
