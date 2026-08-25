import { SAAS_PLANS, SaaSPlanTier } from "./plans.config";

// Comprehensive list of feature keys
export type FeatureKey =
  | "fi.core"
  | "fi.fixed_assets"
  | "fi.cost_centers"
  | "fi.budgeting"
  | "fi.multi_currency"
  | "inv.core"
  | "inv.multi_warehouse"
  | "inv.batch_tracking"
  | "sales.core"
  | "sales.approval_workflows"
  | "hr.lightweight"
  | "reports.custom"
  | "tenant.multi_entity"
  | "tenant.custom_branding"
  | "api.access"
  | "api.webhooks";

// Map each tier to its allowed feature keys
export const PLAN_FEATURES: Record<SaaSPlanTier, FeatureKey[]> = {
  Starter: [
    "fi.core",
    "inv.core",
    "sales.core",
  ],
  Growth: [
    "fi.core",
    "fi.fixed_assets",
    "fi.cost_centers",
    "fi.budgeting",
    "fi.multi_currency",
    "inv.core",
    "inv.multi_warehouse",
    "inv.batch_tracking",
    "sales.core",
    "sales.approval_workflows",
    "api.access",
  ],
  Business: [
    "fi.core",
    "fi.fixed_assets",
    "fi.cost_centers",
    "fi.budgeting",
    "fi.multi_currency",
    "inv.core",
    "inv.multi_warehouse",
    "inv.batch_tracking",
    "sales.core",
    "sales.approval_workflows",
    "api.access",
    "hr.lightweight",
    "reports.custom",
    "tenant.multi_entity",
    "tenant.custom_branding",
    "api.webhooks",
  ]
};

// Returns the list of features active for a given plan
export function getFeaturesForPlan(planId: string | null | undefined): FeatureKey[] {
  if (!planId) return PLAN_FEATURES.Starter; // Default if none
  const tier = planId as SaaSPlanTier;
  return PLAN_FEATURES[tier] || PLAN_FEATURES.Starter;
}
