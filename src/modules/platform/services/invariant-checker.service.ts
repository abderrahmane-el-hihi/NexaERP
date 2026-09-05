import { withTenant, withPlatformBypass } from "@/shared/db/prisma";
import { dec, toNumber } from "@/shared/money";
import { LEDGER_STATUSES } from "@/modules/finance/services/posting.service";

/**
 * The nightly conscience of the system.
 *
 * Every invariant the code claims to hold is re-checked against the data. This is what
 * turns "we wrote it carefully" into "we know it is still true" — and it is the first
 * thing to run after any migration or data repair.
 */

export interface InvariantViolation {
  code:
    | "UNBALANCED_ENTRY"
    | "STOCK_LEVEL_DRIFT"
    | "STOCK_VALUE_MISMATCH"
    | "INVOICE_RESIDUAL_DRIFT"
    | "SEQUENCE_GAP"
    | "ORPHAN_POSTED_INVOICE"
    | "UNCLEARED_INVOICE";
  detail: string;
  entityId?: string;
}

export interface InvariantReport {
  tenantId: string;
  checkedAt: Date;
  violations: InvariantViolation[];
  ok: boolean;
}

export async function checkTenantInvariants(tenantId: string): Promise<InvariantReport> {
  const violations: InvariantViolation[] = [];

  await withTenant(tenantId, async (tx) => {
    // I1 — every entry balances.
    const unbalanced = await tx.$queryRawUnsafe<{ id: string; number: string; diff: string }[]>(
      `
      SELECT e."id", e."number", (SUM(l."debit") - SUM(l."credit"))::text AS diff
      FROM "JournalEntry" e
      JOIN "JournalEntryLine" l ON l."journalEntryId" = e."id"
      WHERE e."tenantId" = $1
      GROUP BY e."id", e."number"
      HAVING SUM(l."debit") <> SUM(l."credit")
      `,
      tenantId
    );
    for (const row of unbalanced) {
      violations.push({
        code: "UNBALANCED_ENTRY",
        entityId: row.id,
        detail: `Écriture ${row.number} déséquilibrée de ${row.diff}`,
      });
    }

    // I5 — the level cache agrees with the movement ledger.
    const drift = await tx.$queryRawUnsafe<
      { productId: string; warehouseId: string; cached: string; actual: string }[]
    >(
      `
      SELECT COALESCE(s."productId", m."productId")   AS "productId",
             COALESCE(s."warehouseId", m."warehouseId") AS "warehouseId",
             COALESCE(s."quantity", 0)::text          AS cached,
             COALESCE(m.total, 0)::text               AS actual
      FROM "StockLevel" s
      FULL OUTER JOIN (
        SELECT "productId", "warehouseId", SUM("quantity") AS total
        FROM "StockMovement" WHERE "tenantId" = $1
        GROUP BY "productId", "warehouseId"
      ) m ON m."productId" = s."productId" AND m."warehouseId" = s."warehouseId"
      WHERE COALESCE(s."quantity", 0) <> COALESCE(m.total, 0)
      `,
      tenantId
    );
    for (const row of drift) {
      violations.push({
        code: "STOCK_LEVEL_DRIFT",
        entityId: row.productId,
        detail: `Stock en cache ${row.cached} vs mouvements ${row.actual} (entrepôt ${row.warehouseId})`,
      });
    }

    // I6 — stock value equals the 3111 balance.
    const stockAccount = await tx.account.findFirst({ where: { tenantId, code: "3111" } });
    if (stockAccount) {
      const layers = await tx.valuationLayer.aggregate({
        where: { tenantId },
        _sum: { value: true },
      });
      const lines = await tx.journalEntryLine.aggregate({
        where: {
          tenantId,
          accountId: stockAccount.id,
          journalEntry: { status: { in: [...LEDGER_STATUSES] } },
        },
        _sum: { debit: true, credit: true },
      });
      const layerValue = dec(layers._sum.value ?? 0);
      const accountBalance = dec(lines._sum.debit ?? 0).minus(dec(lines._sum.credit ?? 0));

      if (!layerValue.minus(accountBalance).abs().lessThan("0.01")) {
        violations.push({
          code: "STOCK_VALUE_MISMATCH",
          detail: `Valeur du stock ${layerValue.toFixed(2)} vs compte 3111 ${accountBalance.toFixed(2)}`,
        });
      }
    }

    // Invoice residual must equal total minus what has been allocated to it.
    const residualDrift = await tx.$queryRawUnsafe<
      { id: string; number: string; stored: string; computed: string }[]
    >(
      `
      SELECT i."id", i."number", i."amountDue"::text AS stored,
             (i."total" - COALESCE(a.allocated, 0))::text AS computed
      FROM "Invoice" i
      LEFT JOIN (
        SELECT "invoiceId", SUM("amount") AS allocated
        FROM "PaymentAllocation" WHERE "tenantId" = $1 GROUP BY "invoiceId"
      ) a ON a."invoiceId" = i."id"
      WHERE i."tenantId" = $1
        AND i."status" IN ('Posted', 'Paid')
        AND i."amountDue" <> (i."total" - COALESCE(a.allocated, 0))
      `,
      tenantId
    );
    for (const row of residualDrift) {
      violations.push({
        code: "INVOICE_RESIDUAL_DRIFT",
        entityId: row.id,
        detail: `Facture ${row.number}: solde stocké ${row.stored}, calculé ${row.computed}`,
      });
    }

    // A posted invoice without a ledger entry is the exact bug this rebuild fixed;
    // the checker makes sure it can never come back unnoticed.
    const orphans = await tx.invoice.findMany({
      where: { tenantId, status: { in: ["Posted", "Paid"] }, journalEntryId: null },
      select: { id: true, number: true },
    });
    for (const row of orphans) {
      violations.push({
        code: "ORPHAN_POSTED_INVOICE",
        entityId: row.id,
        detail: `Facture ${row.number} comptabilisée sans écriture au grand livre`,
      });
    }

    // Gapless numbering: the highest number issued must equal the count issued.
    const sequences = await tx.tenantSequence.findMany({ where: { tenantId } });
    for (const seq of sequences) {
      if (seq.type !== "Invoice") continue;
      const issued = await tx.invoice.count({
        where: {
          tenantId,
          status: { in: ["Posted", "Paid", "Cancelled"] },
          number: { startsWith: `FA-${seq.year}-` },
        },
      });
      const consumed = seq.nextValue - 1;
      if (issued !== consumed) {
        violations.push({
          code: "SEQUENCE_GAP",
          detail: `Séquence facture ${seq.year}: ${consumed} numéros consommés pour ${issued} factures`,
        });
      }
    }

    // Every posted invoice that should have been cleared, was.
    const uncleared = await tx.invoice.findMany({
      where: {
        tenantId,
        status: { in: ["Posted", "Paid"] },
        dgiSubmissionStatus: { in: ["Pending", "Rejected"] },
      },
      select: { id: true, number: true, dgiSubmissionStatus: true },
    });
    for (const row of uncleared) {
      violations.push({
        code: "UNCLEARED_INVOICE",
        entityId: row.id,
        detail: `Facture ${row.number} non validée par la DGI (${row.dgiSubmissionStatus})`,
      });
    }
  });

  return {
    tenantId,
    checkedAt: new Date(),
    violations,
    ok: violations.length === 0,
  };
}

/** Runs the checks for every tenant. Intended to run nightly. */
export async function checkAllTenants(): Promise<InvariantReport[]> {
  const tenants = await withPlatformBypass((tx) =>
    tx.tenant.findMany({
      where: { subscriptionStatus: { not: "Purged" } },
      select: { id: true },
    })
  );

  const reports: InvariantReport[] = [];
  for (const tenant of tenants) {
    reports.push(await checkTenantInvariants(tenant.id));
  }
  return reports;
}

/** Convenience for a report screen. */
export function summarize(reports: InvariantReport[]) {
  const violations = reports.flatMap((r) => r.violations);
  const byCode = new Map<string, number>();
  for (const v of violations) byCode.set(v.code, (byCode.get(v.code) ?? 0) + 1);

  return {
    tenantsChecked: reports.length,
    tenantsWithViolations: reports.filter((r) => !r.ok).length,
    totalViolations: violations.length,
    byCode: [...byCode.entries()].map(([code, count]) => ({ code, count })),
    healthScore: toNumber(
      reports.length === 0
        ? dec(100)
        : dec(reports.filter((r) => r.ok).length).dividedBy(reports.length).times(100)
    ),
  };
}
