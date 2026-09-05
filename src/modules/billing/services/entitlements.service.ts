import { withPlatformBypass, type Tx } from "@/shared/db/prisma";
import { dec } from "@/shared/money";
import { domainError } from "@/shared/errors";

/**
 * Entitlements — the only bridge between billing and the product.
 *
 * ERP code may ask two questions: "is this feature included?" and "has this limit been
 * reached?". It may not read subscriptions, prices or invoices. Keeping the boundary
 * this narrow is what stops a billing change from breaking accounting.
 *
 * Reads run under the platform bypass because a tenant's plan is platform data, not
 * tenant data, and must be readable while resolving the request context.
 */

export type FeatureKey =
  | "stock"
  | "purchasing"
  | "einvoicing"
  | "multiWarehouse"
  | "analytics"
  | "hr"
  | "api"
  | "multiCompany";

export type LimitKey = "users" | "warehouses" | "invoicesPerMonth" | "products";

export interface Entitlements {
  planCode: string;
  status: string;
  features: FeatureKey[];
  limits: Partial<Record<LimitKey, number>>;
  /** Read-only means the tenant may look at and export their data but not post. */
  readOnly: boolean;
  accessUntil: Date | null;
}

/** Fallback used when a tenant has no subscription row yet (fresh signup, trial). */
const TRIAL_ENTITLEMENTS: Entitlements = {
  planCode: "TRIAL",
  status: "Trialing",
  features: ["stock", "purchasing", "einvoicing", "analytics"],
  limits: { users: 3, warehouses: 1, invoicesPerMonth: 50, products: 200 },
  readOnly: false,
  accessUntil: null,
};

const READ_ONLY_STATUSES = new Set(["Suspended", "Cancelled", "Expired", "Paused"]);

export async function getEntitlements(tenantId: string): Promise<Entitlements> {
  return withPlatformBypass(async (tx) => {
    const subscription = await tx.subscription.findFirst({
      where: { tenantId },
      include: { plan: true },
      orderBy: { createdAt: "desc" },
    });

    const tenant = await tx.tenant.findUnique({
      where: { id: tenantId },
      select: { subscriptionStatus: true, subscriptionPlan: true },
    });

    if (!subscription) {
      return {
        ...TRIAL_ENTITLEMENTS,
        status: tenant?.subscriptionStatus ?? "Trial",
        readOnly: READ_ONLY_STATUSES.has(tenant?.subscriptionStatus ?? ""),
      };
    }

    const expired =
      subscription.accessUntil !== null && subscription.accessUntil.getTime() < Date.now();

    return {
      planCode: subscription.plan.code,
      status: subscription.status,
      features: ((subscription.plan.features as string[]) ?? []) as FeatureKey[],
      limits: (subscription.plan.limits as Partial<Record<LimitKey, number>>) ?? {},
      readOnly: READ_ONLY_STATUSES.has(subscription.status) || expired,
      accessUntil: subscription.accessUntil,
    };
  });
}

export async function hasFeature(tenantId: string, feature: FeatureKey): Promise<boolean> {
  const ent = await getEntitlements(tenantId);
  return ent.features.includes(feature);
}

export async function requireFeature(tenantId: string, feature: FeatureKey): Promise<void> {
  const ent = await getEntitlements(tenantId);
  if (!ent.features.includes(feature)) {
    throw domainError(
      "FEATURE_NOT_AVAILABLE",
      `La fonctionnalité « ${feature} » n'est pas incluse dans l'offre ${ent.planCode}`,
      { feature, plan: ent.planCode }
    );
  }
}

/**
 * Refuses a write when the tenant is suspended, while leaving reads and exports open.
 * A customer behind on payment keeps access to their own accounting — that is both the
 * decent thing and the legally safe one.
 */
export async function assertWritable(tenantId: string): Promise<void> {
  const ent = await getEntitlements(tenantId);
  if (ent.readOnly) {
    throw domainError(
      "TENANT_SUSPENDED",
      "Votre espace est en lecture seule. Régularisez votre abonnement pour reprendre la saisie.",
      { status: ent.status }
    );
  }
}

export async function limitOf(tenantId: string, key: LimitKey): Promise<number | null> {
  const ent = await getEntitlements(tenantId);
  const value = ent.limits[key];
  return value === undefined ? null : value;
}

/**
 * Structural limits are hard: seats and warehouses are countable and refusing is
 * unambiguous. Volume limits are soft: the document is accepted and the overage is
 * reported, because losing a customer's invoice to enforce a quota is indefensible.
 */
export async function assertWithinLimit(
  tx: Tx,
  tenantId: string,
  key: LimitKey,
  currentCount: number
): Promise<void> {
  const limit = await limitOf(tenantId, key);
  if (limit === null) return;
  if (currentCount + 1 > limit) {
    throw domainError(
      "LIMIT_REACHED",
      `Limite atteinte pour « ${key} » (${limit}). Passez à une offre supérieure pour en ajouter.`,
      { limit, current: currentCount, key }
    );
  }
}

/** Records usage for the current month; returns the running total. */
export async function recordUsage(
  tx: Tx,
  tenantId: string,
  metric: string,
  quantity = 1
): Promise<number> {
  const now = new Date();
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));

  const counter = await tx.usageCounter.upsert({
    where: { tenantId_metric_periodStart: { tenantId, metric, periodStart } },
    update: { used: { increment: quantity } },
    create: { tenantId, metric, periodStart, periodEnd, used: quantity },
  });

  return dec(counter.used).toNumber();
}
