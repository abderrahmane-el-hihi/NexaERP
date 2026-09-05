"use server";

import { scopedPrisma } from "@/shared/db/prisma";
import { getTenantId } from "@/lib/auth";
import { SAAS_PLANS, type SaaSPlanTier, type PlanDefinition } from "../config/plans.config";
import type { TenantModuleSettings } from "@/modules/tenant/services/tenant.service";

export async function getTenantPlanDetails() {
  const tenantId = await getTenantId();

  const tenant = await scopedPrisma(tenantId).tenant.findUnique({
    where: { id: tenantId },
    include: {
      memberships: true,
      warehouses: true,
    },
  });

  const planId = (tenant?.subscriptionPlan as SaaSPlanTier) || "Business";
  const currentPlan = SAAS_PLANS[planId] || SAAS_PLANS.Business;

  return {
    tenantId,
    currentPlan,
    planId,
    userCount: tenant?.memberships.length || 1,
    warehouseCount: tenant?.warehouses.length || 1,
    allPlans: Object.values(SAAS_PLANS),
  };
}

export async function upgradeTenantPlan(newPlanId: SaaSPlanTier) {
  const tenantId = await getTenantId();
  const targetPlan = SAAS_PLANS[newPlanId];
  if (!targetPlan) throw new Error("Invalid plan tier selected");

  const existing = await scopedPrisma(tenantId).tenant.findUnique({ where: { id: tenantId } });
  const existingModules = (existing?.enabledModules as TenantModuleSettings) || {};

  const updatedModules = {
    ...existingModules,
    modules: targetPlan.allowedModules,
  };

  return await scopedPrisma(tenantId).tenant.update({
    where: { id: tenantId },
    data: {
      subscriptionPlan: newPlanId,
      enabledModules: updatedModules,
    },
  });
}
