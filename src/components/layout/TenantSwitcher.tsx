"use client";

import { useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { BuildingOffice2Icon, PlusIcon } from "@heroicons/react/24/outline";
import { switchActiveTenant } from "@/lib/actions";
import { useRouter } from "next/navigation";

interface TenantSwitcherProps {
  activeTenantId: string;
  tenants: Array<{
    id: string;
    name: string;
    ICE: string | null;
    city: string | null;
  }>;
}

export function TenantSwitcher({
  activeTenantId,
  tenants,
}: TenantSwitcherProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const current = tenants.find((t) => t.id === activeTenantId) || tenants[0] || {
    id: "demo-tenant",
    name: "Atlas Distribution SARL",
    ICE: "002345678000099",
  };

  function handleSelect(tenantId: string | null) {
    if (!tenantId) return;

    if (tenantId === "__new__") {
      router.push("/onboarding");
      return;
    }

    startTransition(async () => {
      await switchActiveTenant(tenantId);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center">
      <Select value={current.id} onValueChange={handleSelect} disabled={isPending}>
        <SelectTrigger className="h-9 px-3 border border-border bg-muted/40 hover:bg-muted/70 text-xs font-semibold rounded-lg flex items-center gap-2 max-w-[240px]">
          <BuildingOffice2Icon className="h-4 w-4 text-primary shrink-0" />
          <span className="truncate">{current.name}</span>
        </SelectTrigger>
        <SelectContent align="start" className="w-64">
          <div className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Active Workspaces (SaaS)
          </div>
          {tenants.map((t) => (
            <SelectItem key={t.id} value={t.id} className="cursor-pointer py-2">
              <div className="flex flex-col">
                <span className="font-semibold text-xs text-foreground">{t.name}</span>
                {t.ICE && (
                  <span className="text-[10px] text-muted-foreground font-mono">
                    ICE: {t.ICE}
                  </span>
                )}
              </div>
            </SelectItem>
          ))}
          <div className="border-t border-border mt-1 pt-1">
            <SelectItem value="__new__" className="text-primary font-semibold text-xs cursor-pointer">
              <div className="flex items-center gap-1.5 py-0.5">
                <PlusIcon className="h-3.5 w-3.5" />
                Register New Enterprise
              </div>
            </SelectItem>
          </div>
        </SelectContent>
      </Select>
    </div>
  );
}
