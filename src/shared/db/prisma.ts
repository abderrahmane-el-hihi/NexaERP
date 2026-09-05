import { PrismaClient } from "../../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/**
 * A Prisma transaction client. Every domain service takes one of these so that a
 * document, its ledger entries and its sequence consumption commit or fail together.
 */
export type Tx = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

/**
 * Runs `fn` inside a transaction with the Postgres tenant context set.
 *
 * `SET LOCAL app.tenant_id` activates the row level security policies created in
 * migration 20260905163500_rls_and_integrity. A query inside this transaction that
 * forgets its tenant filter returns zero rows instead of another company's data.
 *
 * Always use this instead of `prisma.$transaction` directly in tenant-facing code.
 */
export async function withTenant<T>(
  tenantId: string,
  fn: (tx: Tx) => Promise<T>,
  options?: { timeout?: number; maxWait?: number }
): Promise<T> {
  if (!tenantId) throw new Error("withTenant called without a tenantId");

  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe(`SELECT set_config('app.tenant_id', $1, true)`, tenantId);
      return fn(tx);
    },
    {
      timeout: options?.timeout ?? 20_000,
      maxWait: options?.maxWait ?? 10_000,
    }
  );
}

/**
 * A tenant-scoped view of the client for simple, single-statement reads and writes.
 *
 * Every call is executed in its own `withTenant` transaction, so row level security
 * applies. Use it for list queries and one-shot updates; anything that must be atomic
 * across several statements (a document plus its ledger entry, a sequence plus the
 * document that consumes it) must use `withTenant` directly.
 */
export function scopedPrisma(tenantId: string) {
  return new Proxy(
    {},
    {
      get(_target, model: string) {
        return new Proxy(
          {},
          {
            get(_t, operation: string) {
              return (...args: unknown[]) =>
                withTenant(tenantId, (tx) => {
                  const delegate = (tx as unknown as Record<string, Record<string, (...a: unknown[]) => unknown>>)[model];
                  if (!delegate || typeof delegate[operation] !== "function") {
                    throw new Error(`Unknown Prisma operation ${model}.${operation}`);
                  }
                  return delegate[operation](...args) as Promise<unknown>;
                });
            },
          }
        );
      },
    }
  ) as PrismaClient;
}

/**
 * Cross-tenant access for platform work only: the billing run, the clearance poller,
 * the invariant checker. Never reachable from a tenant-facing request path.
 */
export async function withPlatformBypass<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SELECT set_config('app.bypass_rls', 'on', true)`);
    return fn(tx);
  }, { timeout: 60_000 });
}
