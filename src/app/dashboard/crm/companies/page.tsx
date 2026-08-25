import { BuildingOffice2Icon } from "@heroicons/react/24/outline";
import { getCompanies } from "@/modules/crm/services/company.service";
import { AddCompanyDialog } from "@/modules/crm/components/AddCompanyDialog";
import { EditCompanyDialog } from "@/modules/crm/components/EditCompanyDialog";
import { ImportCompaniesDialog } from "@/modules/importer/components/ImportCompaniesDialog";
import Link from "next/link";

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const companies = await getCompanies(type);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <BuildingOffice2Icon className="h-8 w-8 text-primary" />
            Moroccan Companies Master (CRM)
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Customers, Prospects, and Suppliers with Moroccan legal identifiers (ICE, IF, RC).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ImportCompaniesDialog />
          <AddCompanyDialog />
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        {["All", "customer", "prospect", "supplier"].map((f) => {
          const isActive = (type === f) || (!type && f === "All");
          return (
            <Link
              key={f}
              href={`/dashboard/crm/companies${f === "All" ? "" : `?type=${f}`}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                isActive 
                  ? "bg-primary text-primary-foreground border-primary shadow-xs" 
                  : "bg-muted/40 border-border hover:bg-muted text-muted-foreground"
              } capitalize`}
            >
              {f}
            </Link>
          );
        })}
      </div>

      {/* Table */}
      <div className="border border-border rounded-xl overflow-hidden shadow-sm bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Company Name</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Type</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground font-mono text-xs">ICE (15 digits)</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground font-mono text-xs">IF</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground font-mono text-xs">RC</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">City</th>
                <th className="px-5 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {companies.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <BuildingOffice2Icon className="h-10 w-10 opacity-20" />
                      <p className="font-medium">No companies registered yet</p>
                      <p className="text-xs">Add your first client or import from CSV.</p>
                      <div className="mt-2 flex items-center gap-2">
                        <ImportCompaniesDialog />
                        <AddCompanyDialog />
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                companies.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                    <td className="px-5 py-3 font-semibold text-foreground">{c.name}</td>
                    <td className="px-5 py-3 capitalize text-xs">
                      <span className={`px-2 py-0.5 rounded-full font-medium ${
                        c.type === "Customer" || c.type === "customer"
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : c.type === "Supplier" || c.type === "supplier"
                          ? "bg-purple-50 text-purple-700 border border-purple-200"
                          : "bg-slate-100 text-slate-700"
                      }`}>
                        {c.type}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{c.ICE || "—"}</td>
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{c.IF || "—"}</td>
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{c.RC || "—"}</td>
                    <td className="px-5 py-3 text-muted-foreground text-xs">{c.city || "—"}</td>
                    <td className="px-5 py-3 text-right">
                      <EditCompanyDialog company={c} />
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
