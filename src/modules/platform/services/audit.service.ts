import type { Tx } from "@/shared/db/prisma";

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "POST"
  | "CANCEL"
  | "REVERSE"
  | "DELETE"
  | "OVERRIDE"
  | "CLEARANCE_SUBMIT"
  | "CLEARANCE_RESULT";

/**
 * Immutable who-did-what-when. Written inside the same transaction as the change it
 * describes, so an audit row exists if and only if the change happened.
 */
export async function audit(
  tx: Tx,
  input: {
    tenantId: string;
    userId?: string | null;
    entityType: string;
    entityId: string;
    action: AuditAction;
    diff?: unknown;
    reason?: string | null;
  }
): Promise<void> {
  await tx.auditLog.create({
    data: {
      tenantId: input.tenantId,
      userId: input.userId ?? null,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      diff: (input.diff ?? null) as never,
      reason: input.reason ?? null,
    },
  });
}

/** Computes a shallow field-level diff for the audit trail. */
export function diffOf(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): Record<string, { old: unknown; new: unknown }> {
  const out: Record<string, { old: unknown; new: unknown }> = {};
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    const o = before[key];
    const n = after[key];
    if (String(o) !== String(n)) out[key] = { old: o ?? null, new: n ?? null };
  }
  return out;
}
