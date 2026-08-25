import type { ModuleCode } from "./module-config";
import { MODULES } from "./module-config";

/**
 * Check whether a module is active for a given tenant.
 *
 * Rules (from 09-module-catalog.md):
 *  1. Always-on modules (CRM, SD, FI, DOC) are always true regardless of enabledModules.
 *  2. COMP is activated by the system based on DGI wave date — for now treated as opt-in
 *     until the wave-date check logic is wired.
 *  3. MM + INV are opt-in: must explicitly appear in enabledModules.
 *
 * @param enabledModules - The `Tenant.enabledModules` JSON field (array of ModuleCode strings)
 * @param code - The module code to check
 */
export function isTenantModuleEnabled(
  enabledModules: unknown,
  code: ModuleCode
): boolean {
  const def = MODULES[code];

  // Always-on modules are never gated
  if (def.alwaysOn) return true;

  // Parse the JSON array stored in Tenant.enabledModules
  if (!Array.isArray(enabledModules)) return false;

  return (enabledModules as string[]).includes(code);
}

/**
 * Build the default enabledModules value for a new tenant.
 * Includes all always-on modules. MM and INV are opt-in (not included by default).
 */
export function buildDefaultEnabledModules(): ModuleCode[] {
  return Object.values(MODULES)
    .filter((m) => m.alwaysOn)
    .map((m) => m.code);
}
