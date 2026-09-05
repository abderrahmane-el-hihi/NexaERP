import { scopedPrisma } from "@/shared/db/prisma";
import { FeatureKey, getFeaturesForPlan } from "../config/features.config";

export class FeatureNotEnabledError extends Error {
  constructor(featureKey: FeatureKey) {
    super(`Feature '${featureKey}' is not enabled for your current subscription plan.`);
    this.name = "FeatureNotEnabledError";
  }
}

export class LimitExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LimitExceededError";
  }
}

export class FeatureGuardService {
  /**
   * Enforces that the specified tenant has the required feature enabled.
   * Throws FeatureNotEnabledError if the feature is absent.
   */
  static async requireFeature(tenantId: string, featureKey: FeatureKey): Promise<void> {
    const tenant = await scopedPrisma(tenantId).tenant.findUnique({
      where: { id: tenantId },
      select: { subscriptionPlan: true }
    });

    if (!tenant) throw new Error("Tenant not found");

    const activeFeatures = getFeaturesForPlan(tenant.subscriptionPlan);
    
    if (!activeFeatures.includes(featureKey)) {
      throw new FeatureNotEnabledError(featureKey);
    }
  }

  /**
   * Checks if a tenant has a specific feature enabled, returning boolean instead of throwing.
   */
  static async hasFeature(tenantId: string, featureKey: FeatureKey): Promise<boolean> {
    try {
      await this.requireFeature(tenantId, featureKey);
      return true;
    } catch {
      return false;
    }
  }
}
