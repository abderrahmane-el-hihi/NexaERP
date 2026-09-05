import { describe, it, expect } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import { withTenant, withPlatformBypass } from "@/shared/db/prisma";
import { dec, sum } from "@/shared/money";
import { postEntry, reverseEntry } from "@/modules/finance/services/posting.service";
import { nextNumber } from "@/modules/platform/services/sequence.service";
import { applyMovement, rebuildStockLevels } from "@/modules/inv/services/stock-ledger.service";
import { createTestTenant, createProduct } from "./helpers/factory";

/**
 * The invariants from the blueprint, asserted against a real Postgres with row level
 * security on. These are the tests that make the rest of the system trustworthy: if
 * one of them fails, something is wrong with the money or the stock, not with a screen.
 */

describe("I1 — every journal entry balances", () => {
  it("posts a balanced entry", async () => {
    const t = await createTestTenant();

    const entry = await withTenant(t.tenantId, (tx) =>
      postEntry(tx, {
        tenantId: t.tenantId,
        date: new Date(),
        description: "Test",
        journalCode: "OD",
        lines: [
          { accountCode: "3421", companyId: t.companyId, debit: "1200.00" },
          { accountCode: "7111", credit: "1000.00" },
          { accountCode: "4455", credit: "200.00" },
        ],
      })
    );

    const lines = await withTenant(t.tenantId, (tx) =>
      tx.journalEntryLine.findMany({ where: { journalEntryId: entry.id } })
    );

    expect(sum(lines.map((l) => l.debit)).equals(sum(lines.map((l) => l.credit)))).toBe(true);
  });

  it("refuses an unbalanced entry with no tolerance", async () => {
    const t = await createTestTenant();

    await expect(
      withTenant(t.tenantId, (tx) =>
        postEntry(tx, {
          tenantId: t.tenantId,
          date: new Date(),
          description: "Déséquilibrée",
          lines: [
            { accountCode: "3421", debit: "100.00" },
            { accountCode: "7111", credit: "99.99" },
          ],
        })
      )
    ).rejects.toThrow(/déséquilibrée/i);
  });

  it("refuses a line carrying both a debit and a credit", async () => {
    const t = await createTestTenant();

    await expect(
      withTenant(t.tenantId, (tx) =>
        postEntry(tx, {
          tenantId: t.tenantId,
          date: new Date(),
          description: "Ligne double",
          lines: [
            { accountCode: "3421", debit: "100.00", credit: "100.00" },
            { accountCode: "7111", credit: "100.00", debit: "100.00" },
          ],
        })
      )
    ).rejects.toThrow(/débit ou un crédit/i);
  });

  it("is also enforced by the database, not only by the service", async () => {
    const t = await createTestTenant();

    // Write an unbalanced entry directly, bypassing the posting service entirely.
    await expect(
      withTenant(t.tenantId, async (tx) => {
        const account = await tx.account.findFirstOrThrow({
          where: { tenantId: t.tenantId, code: "3421" },
        });
        await tx.journalEntry.create({
          data: {
            tenantId: t.tenantId,
            number: `RAW-${Date.now()}`,
            date: new Date(),
            description: "Écriture forcée",
            status: "Posted",
            lines: {
              create: [
                { tenantId: t.tenantId, accountId: account.id, debit: new Prisma.Decimal("50") },
              ],
            },
          },
        });
      })
    ).rejects.toThrow(/unbalanced/i);
  });
});

describe("I2 / I3 — posted entries are immutable, corrections are reversals", () => {
  it("reverses instead of deleting, and both entries remain visible", async () => {
    const t = await createTestTenant();

    const entry = await withTenant(t.tenantId, (tx) =>
      postEntry(tx, {
        tenantId: t.tenantId,
        date: new Date(),
        description: "À contrepasser",
        lines: [
          { accountCode: "3421", debit: "500.00" },
          { accountCode: "7111", credit: "500.00" },
        ],
      })
    );

    const reversal = await withTenant(t.tenantId, (tx) =>
      reverseEntry(tx, t.tenantId, entry.id, { reason: "Erreur de saisie" })
    );

    const [original, mirrored] = await withTenant(t.tenantId, async (tx) => [
      await tx.journalEntry.findUniqueOrThrow({ where: { id: entry.id } }),
      await tx.journalEntry.findUniqueOrThrow({
        where: { id: reversal.id },
        include: { lines: { include: { account: true } } },
      }),
    ]);

    expect(original.status).toBe("Reversed");
    expect(mirrored.reversalOfId).toBe(entry.id);

    const debitOn3421 = mirrored.lines.find((l) => l.account.code === "3421");
    expect(dec(debitOn3421!.credit).toFixed(2)).toBe("500.00");
  });

  it("the database refuses to delete a posted entry", async () => {
    const t = await createTestTenant();
    const entry = await withTenant(t.tenantId, (tx) =>
      postEntry(tx, {
        tenantId: t.tenantId,
        date: new Date(),
        description: "Protégée",
        lines: [
          { accountCode: "3421", debit: "10.00" },
          { accountCode: "7111", credit: "10.00" },
        ],
      })
    );

    await expect(
      withTenant(t.tenantId, (tx) => tx.journalEntry.delete({ where: { id: entry.id } }))
    ).rejects.toThrow(/cannot be deleted|reversal/i);
  });
});

describe("I4 — numbering is gapless and rolls back with its transaction", () => {
  it("issues consecutive numbers", async () => {
    const t = await createTestTenant();
    const numbers = await withTenant(t.tenantId, async (tx) => [
      await nextNumber(tx, t.tenantId, "Invoice", 2026),
      await nextNumber(tx, t.tenantId, "Invoice", 2026),
      await nextNumber(tx, t.tenantId, "Invoice", 2026),
    ]);

    expect(numbers).toEqual(["FA-2026-00001", "FA-2026-00002", "FA-2026-00003"]);
  });

  it("does not burn a number when the transaction fails", async () => {
    const t = await createTestTenant();

    await withTenant(t.tenantId, (tx) => nextNumber(tx, t.tenantId, "Invoice", 2026));

    await expect(
      withTenant(t.tenantId, async (tx) => {
        await nextNumber(tx, t.tenantId, "Invoice", 2026); // would be 00002
        throw new Error("document save failed");
      })
    ).rejects.toThrow("document save failed");

    const next = await withTenant(t.tenantId, (tx) => nextNumber(tx, t.tenantId, "Invoice", 2026));

    // Without transaction-aware numbering this would be FA-2026-00003 and the sequence
    // would have a hole in it — which the DGI platform rejects.
    expect(next).toBe("FA-2026-00002");
  });

  it("serialises concurrent callers without issuing a duplicate", async () => {
    const t = await createTestTenant();

    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        withTenant(t.tenantId, (tx) => nextNumber(tx, t.tenantId, "Invoice", 2027))
      )
    );

    expect(new Set(results).size).toBe(10);
    expect([...results].sort()).toEqual(
      Array.from({ length: 10 }, (_, i) => `FA-2027-${String(i + 1).padStart(5, "0")}`)
    );
  });
});

describe("I5 / I6 — stock quantity and value agree with their ledgers", () => {
  it("keeps on-hand equal to the sum of movements over a random workload", async () => {
    const t = await createTestTenant();
    const product = await createProduct(t.tenantId, {
      name: "Aléatoire",
      purchasePrice: "10",
    });

    let expected = dec(0);

    for (let i = 0; i < 40; i++) {
      const incoming = i % 3 !== 2 || expected.lessThan(5);
      const qty = dec(Math.floor(Math.random() * 5) + 1);

      await withTenant(t.tenantId, (tx) =>
        applyMovement(tx, {
          tenantId: t.tenantId,
          productId: product.id,
          warehouseId: t.warehouseId,
          quantity: incoming ? qty : qty.negated(),
          unitCost: incoming ? "10" : undefined,
          reason: incoming ? "PurchaseReceipt" : "SalesDelivery",
        })
      );

      expected = incoming ? expected.plus(qty) : expected.minus(qty);
    }

    const { level, movementSum, layerValue } = await withTenant(t.tenantId, async (tx) => {
      const level = await tx.stockLevel.findUniqueOrThrow({
        where: { productId_warehouseId: { productId: product.id, warehouseId: t.warehouseId } },
      });
      const movements = await tx.stockMovement.aggregate({
        where: { tenantId: t.tenantId, productId: product.id },
        _sum: { quantity: true },
      });
      const layers = await tx.valuationLayer.aggregate({
        where: { tenantId: t.tenantId, productId: product.id },
        _sum: { value: true },
      });
      return {
        level: dec(level.quantity),
        movementSum: dec(movements._sum.quantity ?? 0),
        layerValue: dec(layers._sum.value ?? 0),
      };
    });

    expect(level.toFixed(6)).toBe(expected.toFixed(6));
    expect(movementSum.toFixed(6)).toBe(expected.toFixed(6));

    // Every unit came in and went out at 10, so value must be quantity * 10.
    expect(layerValue.toFixed(2)).toBe(expected.times(10).toFixed(2));
  });

  it("does not lose concurrent movements", async () => {
    const t = await createTestTenant();
    const product = await createProduct(t.tenantId, { name: "Concurrent", purchasePrice: "5" });

    await Promise.all(
      Array.from({ length: 20 }, () =>
        withTenant(t.tenantId, (tx) =>
          applyMovement(tx, {
            tenantId: t.tenantId,
            productId: product.id,
            warehouseId: t.warehouseId,
            quantity: 1,
            unitCost: "5",
            reason: "PurchaseReceipt",
          })
        )
      )
    );

    const level = await withTenant(t.tenantId, (tx) =>
      tx.stockLevel.findUniqueOrThrow({
        where: { productId_warehouseId: { productId: product.id, warehouseId: t.warehouseId } },
      })
    );

    // A read-then-write update loses roughly half of these.
    expect(dec(level.quantity).toFixed(0)).toBe("20");
  });

  it("stock value ties to the 3111 account balance", async () => {
    const t = await createTestTenant();

    await withTenant(t.tenantId, (tx) =>
      applyMovement(tx, {
        tenantId: t.tenantId,
        productId: t.productId,
        warehouseId: t.warehouseId,
        quantity: 10,
        unitCost: "60",
        reason: "PurchaseReceipt",
      })
    );
    await withTenant(t.tenantId, (tx) =>
      applyMovement(tx, {
        tenantId: t.tenantId,
        productId: t.productId,
        warehouseId: t.warehouseId,
        quantity: -4,
        reason: "SalesDelivery",
      })
    );

    const { layerValue, accountBalance } = await withTenant(t.tenantId, async (tx) => {
      const layers = await tx.valuationLayer.aggregate({
        where: { tenantId: t.tenantId },
        _sum: { value: true },
      });
      const account = await tx.account.findFirstOrThrow({
        where: { tenantId: t.tenantId, code: "3111" },
      });
      const lines = await tx.journalEntryLine.aggregate({
        where: { tenantId: t.tenantId, accountId: account.id },
        _sum: { debit: true, credit: true },
      });
      return {
        layerValue: dec(layers._sum.value ?? 0),
        accountBalance: dec(lines._sum.debit ?? 0).minus(dec(lines._sum.credit ?? 0)),
      };
    });

    expect(layerValue.toFixed(2)).toBe("360.00"); // 6 units at 60
    expect(accountBalance.toFixed(2)).toBe(layerValue.toFixed(2));
  });

  it("rebuilds the level cache from the movement ledger", async () => {
    const t = await createTestTenant();

    await withTenant(t.tenantId, (tx) =>
      applyMovement(tx, {
        tenantId: t.tenantId,
        productId: t.productId,
        warehouseId: t.warehouseId,
        quantity: 7,
        unitCost: "60",
        reason: "PurchaseReceipt",
      })
    );

    // Corrupt the cache, then prove it is derived and can be rebuilt.
    await withTenant(t.tenantId, (tx) =>
      tx.stockLevel.updateMany({
        where: { tenantId: t.tenantId },
        data: { quantity: new Prisma.Decimal("999") },
      })
    );

    await withTenant(t.tenantId, (tx) => rebuildStockLevels(tx, t.tenantId));

    const level = await withTenant(t.tenantId, (tx) =>
      tx.stockLevel.findFirstOrThrow({ where: { tenantId: t.tenantId } })
    );
    expect(dec(level.quantity).toFixed(0)).toBe("7");
  });
});

describe("I8 — nothing posts into a closed period", () => {
  it("refuses a posting in a closed period", async () => {
    const t = await createTestTenant();
    const date = new Date();

    await withTenant(t.tenantId, (tx) =>
      tx.accountingPeriod.updateMany({
        where: { tenantId: t.tenantId, startDate: { lte: date }, endDate: { gte: date } },
        data: { status: "Closed" },
      })
    );

    await expect(
      withTenant(t.tenantId, (tx) =>
        postEntry(tx, {
          tenantId: t.tenantId,
          date,
          description: "Trop tard",
          lines: [
            { accountCode: "3421", debit: "10.00" },
            { accountCode: "7111", credit: "10.00" },
          ],
        })
      )
    ).rejects.toThrow(/clôturée/i);
  });

  it("lets an accountant post into a soft-closed period, and audits it", async () => {
    const t = await createTestTenant();
    const date = new Date();

    await withTenant(t.tenantId, (tx) =>
      tx.accountingPeriod.updateMany({
        where: { tenantId: t.tenantId, startDate: { lte: date }, endDate: { gte: date } },
        data: { status: "SoftClosed" },
      })
    );

    await expect(
      withTenant(t.tenantId, (tx) =>
        postEntry(tx, {
          tenantId: t.tenantId,
          date,
          description: "Sans droit",
          lines: [
            { accountCode: "3421", debit: "10.00" },
            { accountCode: "7111", credit: "10.00" },
          ],
        })
      )
    ).rejects.toThrow(/clôture provisoire/i);

    const entry = await withTenant(t.tenantId, (tx) =>
      postEntry(tx, {
        tenantId: t.tenantId,
        date,
        description: "Ajustement comptable",
        allowSoftClosed: true,
        lines: [
          { accountCode: "3421", debit: "10.00" },
          { accountCode: "7111", credit: "10.00" },
        ],
      })
    );

    const audit = await withTenant(t.tenantId, (tx) =>
      tx.auditLog.findFirst({
        where: { tenantId: t.tenantId, entityId: entry.id, action: "POST" },
      })
    );
    expect(audit?.reason).toMatch(/soft-closed/i);
  });
});

describe("I9 — tenants cannot see each other", () => {
  it("returns nothing when a query is run in the wrong tenant context", async () => {
    const a = await createTestTenant();
    const b = await createTestTenant();

    // Tenant B asks for tenant A's customer by its primary key, with no tenant filter
    // at all — the kind of query a forgotten `where` clause produces.
    const leaked = await withTenant(b.tenantId, (tx) =>
      tx.company.findUnique({ where: { id: a.companyId } })
    );
    expect(leaked).toBeNull();

    const leakedList = await withTenant(b.tenantId, (tx) => tx.company.findMany({}));
    expect(leakedList.every((c) => c.tenantId === b.tenantId)).toBe(true);
  });

  it("refuses to write a row belonging to another tenant", async () => {
    const a = await createTestTenant();
    const b = await createTestTenant();

    await expect(
      withTenant(b.tenantId, (tx) =>
        tx.company.create({
          data: { tenantId: a.tenantId, name: "Injectée", type: "customer" },
        })
      )
    ).rejects.toThrow();
  });

  it("hides everything when no tenant context is set", async () => {
    const a = await createTestTenant();

    const rows = await withPlatformBypass(async (tx) => {
      // Explicitly clear the bypass to simulate a query with no context at all.
      await tx.$executeRawUnsafe(`SELECT set_config('app.bypass_rls', 'off', true)`);
      return tx.company.findMany({ where: { tenantId: a.tenantId } });
    });

    expect(rows).toHaveLength(0);
  });
});
