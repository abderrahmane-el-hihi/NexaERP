"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCardIcon, CheckCircleIcon, BoltIcon, ShieldCheckIcon, SparklesIcon, UsersIcon, BuildingOfficeIcon, ArrowRightIcon } from "@heroicons/react/24/outline";
import { upgradeTenantPlan } from "@/modules/billing/services/plan.service";
import { type SaaSPlanTier, type PlanDefinition } from "@/modules/billing/config/plans.config";
import { useRouter } from "next/navigation";

interface SubscriptionBillingTabProps {
  planData: {
    tenantId: string;
    currentPlan: PlanDefinition;
    planId: string;
    userCount: number;
    warehouseCount: number;
    allPlans: PlanDefinition[];
  };
}

export function SubscriptionBillingTab({ planData }: SubscriptionBillingTabProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedTier, setSelectedTier] = useState<SaaSPlanTier>(
    (planData.planId as SaaSPlanTier) || "Business"
  );

  function handleUpgrade(tier: SaaSPlanTier) {
    setSelectedTier(tier);
    startTransition(async () => {
      await upgradeTenantPlan(tier);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* Current Plan Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-xl p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-indigo-500/20 text-indigo-200 border-indigo-400/30 text-xs">
              Active Subscription
            </Badge>
            <span className="text-xs text-slate-300">Billed Monthly (MAD)</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight mt-1.5 flex items-center gap-2">
            {planData.currentPlan.name}
            <span className="text-indigo-400 text-lg font-bold">
              — {planData.currentPlan.priceMAD} MAD / month
            </span>
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-lg">
            {planData.currentPlan.description}
          </p>
        </div>

        {/* Usage Gauges */}
        <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-lg p-3 shrink-0">
          <div className="text-center px-2">
            <span className="text-[10px] text-slate-300 uppercase block">Team Members</span>
            <span className="text-sm font-bold text-white">
              {planData.userCount} / {planData.currentPlan.maxUsers}
            </span>
          </div>
          <div className="h-6 w-px bg-white/10" />
          <div className="text-center px-2">
            <span className="text-[10px] text-slate-300 uppercase block">Warehouses</span>
            <span className="text-sm font-bold text-white">
              {planData.warehouseCount} / {planData.currentPlan.maxWarehouses}
            </span>
          </div>
        </div>
      </div>

      {/* Plan Tiers Grid */}
      <div>
        <h3 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2 mb-4">
          <CreditCardIcon className="h-5 w-5 text-primary" />
          Available Subscription Tiers
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {planData.allPlans.map((plan) => {
            const isCurrent = plan.id === planData.planId;

            return (
              <div
                key={plan.id}
                className={`bg-card rounded-xl border p-6 flex flex-col justify-between transition-all relative ${
                  isCurrent
                    ? "border-primary ring-2 ring-primary/20 shadow-md"
                    : "border-border hover:border-slate-300 shadow-xs"
                }`}
              >
                {plan.badge && (
                  <span className="absolute -top-2.5 right-4 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                    {plan.badge}
                  </span>
                )}

                <div className="space-y-4">
                  <div>
                    <h4 className="font-bold text-lg text-foreground">{plan.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1 min-h-[32px]">
                      {plan.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-border">
                    <span className="text-3xl font-black text-foreground">
                      {plan.priceMAD}
                    </span>
                    <span className="text-xs text-muted-foreground font-semibold ml-1">
                      MAD / month
                    </span>
                  </div>

                  <div className="space-y-2 pt-2 text-xs">
                    <p className="font-semibold text-slate-700">Included Features:</p>
                    {plan.features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-muted-foreground">
                        <CheckCircleIcon className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-6 mt-4 border-t border-border">
                  {isCurrent ? (
                    <Button disabled className="w-full bg-muted text-muted-foreground font-semibold text-xs" variant="outline">
                      Current Active Plan
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleUpgrade(plan.id)}
                      disabled={isPending}
                      className="w-full text-xs font-semibold"
                      variant={plan.id === "Business" ? "default" : "outline"}
                    >
                      {isPending && selectedTier === plan.id
                        ? "Switching Plan..."
                        : `Switch to ${plan.name}`}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
