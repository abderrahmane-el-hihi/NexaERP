import { CubeIcon } from "@heroicons/react/24/outline";
import { getProducts } from "@/modules/catalog/services/product.service";
import { AddProductDialog } from "@/modules/catalog/components/AddProductDialog";
import { EditProductDialog } from "@/modules/catalog/components/EditProductDialog";
import { ImportProductsDialog } from "@/modules/importer/components/ImportProductsDialog";

export default async function CatalogPage() {
  const products = await getProducts();

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <CubeIcon className="h-8 w-8 text-primary" />
            Product &amp; Services Catalog
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage goods, services, cost baselines, and Moroccan TVA rates (0%, 7%, 10%, 14%, 20%).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ImportProductsDialog />
          <AddProductDialog />
        </div>
      </div>

      <div className="border border-border rounded-xl overflow-hidden shadow-sm bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground font-mono text-xs">Reference</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Product Designation</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Type</th>
                <th className="px-5 py-3 text-right font-medium text-muted-foreground">Unit Price HT</th>
                <th className="px-5 py-3 text-right font-medium text-muted-foreground">TVA Rate</th>
                <th className="px-5 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <CubeIcon className="h-10 w-10 opacity-20" />
                      <p className="font-medium">No items in catalog yet</p>
                      <p className="text-xs">Add a product or import an existing CSV file.</p>
                      <div className="mt-2 flex items-center gap-2">
                        <ImportProductsDialog />
                        <AddProductDialog />
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                    <td className="px-5 py-3 font-mono font-medium text-muted-foreground text-xs">{p.reference || "-"}</td>
                    <td className="px-5 py-3 font-medium text-foreground">{p.name}</td>
                    <td className="px-5 py-3 capitalize text-xs">
                      <span className={`px-2 py-0.5 rounded-full font-medium ${
                        p.type === "service" || p.type === "Service"
                          ? "bg-purple-50 text-purple-700 border border-purple-200"
                          : "bg-blue-50 text-blue-700 border border-blue-200"
                      }`}>
                        {p.type}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-semibold">
                      {new Intl.NumberFormat("fr-MA", { style: "currency", currency: "MAD" }).format(p.salesPrice)}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-xs">{p.tvaRate}%</td>
                    <td className="px-5 py-3 text-right">
                      <EditProductDialog product={p} />
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
