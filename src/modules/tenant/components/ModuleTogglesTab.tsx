"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { MODULES, type ModuleCode } from "@/shared/modules/module-config";
import { updateModuleToggles } from "../services/tenant.service";
import { RectangleStackIcon, CheckIcon, ArrowTrendingUpIcon, ShoppingCartIcon, TruckIcon, CubeIcon, ChartBarIcon, DocumentCheckIcon, PaperClipIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import type { TenantSettingsData } from "@/modules/tenant/services/tenant.service";

interface ModuleTogglesTabProps {
  tenant: TenantSettingsData;
}

const MODULE_ICONS: Record<ModuleCode, React.ElementType> = {
  CRM: ArrowTrendingUpIcon,
  SD: ShoppingCartIcon,
  MM: TruckIcon,
  INV: CubeIcon,
  FI: ChartBarIcon,
  COMP: DocumentCheckIcon,
  DOC: PaperClipIcon,
};

export function ModuleTogglesTab({ tenant }: ModuleTogglesTabProps) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const initialModules = (tenant.enabledModules?.modules as ModuleCode[]) || [
    "CRM",
    "SD",
    "MM",
    "INV",
    "FI",
    "COMP",
    "DOC",
  ];

  const [enabled, setEnabled] = useState<ModuleCode[]>(initialModules);

  function toggleModule(code: ModuleCode, checked: boolean) {
    const modDef = MODULES[code];
    if (modDef?.alwaysOn) return; // Cannot toggle always-on modules

    if (checked) {
      setEnabled((prev) => [...prev, code]);
    } else {
      setEnabled((prev) => prev.filter((c) => c !== code));
    }
    setSaved(false);
  }

  function handleSave() {
    startTransition(async () => {
      await updateModuleToggles(enabled);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  }

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <RectangleStackIcon className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-base">Modular Applications Catalog</h2>
          </div>
          <Badge variant="outline" className="font-mono text-xs">
            {enabled.length} of {Object.keys(MODULES).length} Active
          </Badge>
        </div>

        <p className="text-sm text-muted-foreground">
          NexaERP follows the modular Odoo/SAP architecture. You can enable or disable functional blocks
          to match your business model (e.g., pure service companies can toggle off inventory and stock holding).
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {Object.values(MODULES).map((mod) => {
            const Icon = MODULE_ICONS[mod.code] || RectangleStackIcon;
            const isChecked = enabled.includes(mod.code) || mod.alwaysOn;
            const isLocked = mod.alwaysOn;

            return (
              <div
                key={mod.code}
                className={`flex items-start gap-3.5 p-4 rounded-xl border transition-all ${
                  isChecked
                    ? "bg-card border-primary/30 shadow-xs ring-1 ring-primary/10"
                    : "bg-muted/30 border-border opacity-70"
                }`}
              >
                <div className="pt-0.5">
                  <Checkbox
                    id={`mod-${mod.code}`}
                    checked={isChecked}
                    disabled={isLocked || isPending}
                    onCheckedChange={(c: boolean) => toggleModule(mod.code, c)}
                  />
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor={`mod-${mod.code}`}
                      className="font-semibold text-sm flex items-center gap-1.5 cursor-pointer"
                    >
                      <Icon className="h-4 w-4 text-primary shrink-0" />
                      <span>{mod.name}</span>
                      <span className="text-xs text-muted-foreground font-mono font-normal">
                        ({mod.code})
                      </span>
                    </label>

                    {isLocked ? (
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium bg-muted px-2 py-0.5 rounded-full">
                        <LockClosedIcon className="h-3 w-3" /> Core
                      </span>
                    ) : isChecked ? (
                      <Badge variant="default" className="text-[10px] bg-emerald-600">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">
                        Inactive
                      </Badge>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {mod.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-end gap-3 pt-2">
        {saved && (
          <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
            <CheckIcon className="h-4 w-4" /> Active modules updated!
          </span>
        )}
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? "Saving..." : "Save Module Configuration"}
        </Button>
      </div>
    </div>
  );
}
