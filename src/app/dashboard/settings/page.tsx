import { getTenantSettings } from "@/modules/tenant/services/tenant.service";
import { getTenantPlanDetails } from "@/modules/billing/services/plan.service";
import { SettingsClientView } from "./SettingsClientView";
import { Cog6ToothIcon, BuildingOffice2Icon } from "@heroicons/react/24/outline";

export default async function SettingsPage() {
  const [tenant, planData] = await Promise.all([
    getTenantSettings(),
    getTenantPlanDetails(),
  ]);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2.5">
            <Cog6ToothIcon className="h-7 w-7 text-primary" />
            Enterprise Cog6ToothIcon &amp; Configuration
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your Moroccan legal entity (ICE/RC/IF), commercial terms, module catalog, and team access.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-muted/60 border rounded-xl px-3.5 py-2 text-xs">
            <BuildingOffice2Icon className="h-4 w-4 text-primary" />
            <div>
              <span className="font-semibold text-foreground">{tenant.name}</span>
              <span className="text-muted-foreground ml-1.5 font-mono text-[11px]">
                ICE: {tenant.ICE || "Pending"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabs Container */}
      <SettingsClientView tenant={tenant} planData={planData} />
    </div>
  );
}
