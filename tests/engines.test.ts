import { describe, it, expect } from "vitest";
import { withTenant } from "@/shared/db/prisma";
import { dec } from "@/shared/money";
import { computeLine, computeDocumentTotals } from "@/modules/finance/services/tax.service";
import { applyMovement } from "@/modules/inv/services/stock-ledger.service";
import { buildUbl, validateForClearance, UblValidationError } from "@/modules/einvoice/services/ubl.service";
import { createTestTenant, createProduct } from "./helpers/factory";

describe("tax engine", () => {
  it("computes a line with a discount", () => {
    const line = computeLine({ quantity: 3, unitPrice: "150.00", discountPercent: 10, tvaRate: 20 });
    expect(line.lineSubtotal.toFixed(2)).toBe("405.00"); // 450 less 10%
    expect(line.lineTva.toFixed(2)).toBe("81.00");
    expect(line.lineTotal.toFixed(2)).toBe("486.00");
  });

  it("rounds once per tax group, not per line", () => {
    // Three lines whose individual taxes each end in a half-centime. Rounding each line
    // first gives 3 x 0.005 rounded up = 0.03; rounding the group gives 0.02.
    const lines = Array.from({ length: 3 }, () => ({
      quantity: 1,
      unitPrice: "0.0250",
      tvaRate: 20,
    }));

    const totals = computeDocumentTotals(lines);
    expect(totals.subtotal.toFixed(2)).toBe("0.08"); // 0.075 -> 0.08
    expect(totals.tvaAmount.toFixed(2)).toBe("0.02"); // 0.015 -> 0.02, once
    expect(totals.total.toFixed(2)).toBe("0.10");
  });

  it("keeps subtotal + tax exactly equal to the total", () => {
    const totals = computeDocumentTotals([
      { quantity: 7, unitPrice: "13.33", tvaRate: 20 },
      { quantity: 3, unitPrice: "9.99", tvaRate: 10 },
      { quantity: 1, unitPrice: "1.11", tvaRate: 0 },
    ]);

    expect(totals.subtotal.plus(totals.tvaAmount).equals(totals.total)).toBe(true);
  });

  it("splits the breakdown by rate, which is what the VAT return needs", () => {
    const totals = computeDocumentTotals([
      { quantity: 1, unitPrice: "100.00", tvaRate: 20 },
      { quantity: 1, unitPrice: "100.00", tvaRate: 10 },
      { quantity: 2, unitPrice: "50.00", tvaRate: 20 },
    ]);

    expect(totals.breakdown).toEqual([
      { rate: 10, base: 100, amount: 10 },
      { rate: 20, base: 200, amount: 40 },
    ]);
    expect(totals.tvaAmount.toFixed(2)).toBe("50.00");
  });

  it("survives the float trap: 0.1 + 0.2 sums exactly", () => {
    const totals = computeDocumentTotals([
      { quantity: 1, unitPrice: "0.10", tvaRate: 0 },
      { quantity: 1, unitPrice: "0.20", tvaRate: 0 },
    ]);
    expect(totals.subtotal.toFixed(2)).toBe("0.30");
    expect(totals.subtotal.equals(dec("0.30"))).toBe(true);
  });
});

describe("costing engine", () => {
  it("AVCO: worked example from the blueprint", async () => {
    const t = await createTestTenant({ costingMethod: "AVCO" });
    const product = await createProduct(t.tenantId, { name: "AVCO", purchasePrice: "10" });

    const move = (quantity: number, unitCost?: string) =>
      withTenant(t.tenantId, (tx) =>
        applyMovement(tx, {
          tenantId: t.tenantId,
          productId: product.id,
          warehouseId: t.warehouseId,
          quantity,
          unitCost,
          reason: quantity > 0 ? "PurchaseReceipt" : "SalesDelivery",
        })
      );

    await move(100, "10.00"); // average 10.00
    await move(50, "13.00"); // 1650 / 150 = 11.00
    const issue = await move(-60); // issued at 11.00
    await move(30, "12.00"); // (990 + 360) / 120 = 11.25

    expect(dec(issue!.unitCost).toFixed(2)).toBe("11.00");
    expect(dec(issue!.totalValue).toFixed(2)).toBe("-660.00");

    const { averageCost, value } = await withTenant(t.tenantId, async (tx) => {
      const p = await tx.product.findUniqueOrThrow({ where: { id: product.id } });
      const layers = await tx.valuationLayer.aggregate({
        where: { tenantId: t.tenantId, productId: product.id },
        _sum: { value: true },
      });
      return { averageCost: dec(p.averageCost), value: dec(layers._sum.value ?? 0) };
    });

    expect(averageCost.toFixed(2)).toBe("11.25");
    expect(value.toFixed(2)).toBe("1350.00");
  });

  it("FIFO: consumes the oldest layers first and gives a different COGS", async () => {
    const t = await createTestTenant({ costingMethod: "FIFO" });
    const product = await createProduct(t.tenantId, { name: "FIFO", purchasePrice: "10" });

    const move = (quantity: number, unitCost?: string) =>
      withTenant(t.tenantId, (tx) =>
        applyMovement(tx, {
          tenantId: t.tenantId,
          productId: product.id,
          warehouseId: t.warehouseId,
          quantity,
          unitCost,
          reason: quantity > 0 ? "PurchaseReceipt" : "SalesDelivery",
        })
      );

    await move(100, "10.00");
    await move(50, "13.00");
    const issue = await move(-60);

    // FIFO takes 60 from the 10.00 layer: cost 600, not the 660 AVCO produced.
    expect(dec(issue!.totalValue).toFixed(2)).toBe("-600.00");

    const remaining = await withTenant(t.tenantId, (tx) =>
      tx.valuationLayer.aggregate({
        where: { tenantId: t.tenantId, productId: product.id },
        _sum: { value: true },
      })
    );
    expect(dec(remaining._sum.value ?? 0).toFixed(2)).toBe("1050.00");
  });

  it("blocks a negative movement when the caller asks for it", async () => {
    const t = await createTestTenant();
    await expect(
      withTenant(t.tenantId, (tx) =>
        applyMovement(tx, {
          tenantId: t.tenantId,
          productId: t.productId,
          warehouseId: t.warehouseId,
          quantity: -5,
          reason: "SalesDelivery",
          blockNegative: true,
        })
      )
    ).rejects.toThrow(/stock insuffisant/i);
  });

  it("requires a reason on a manual adjustment", async () => {
    const t = await createTestTenant();
    await expect(
      withTenant(t.tenantId, (tx) =>
        applyMovement(tx, {
          tenantId: t.tenantId,
          productId: t.productId,
          warehouseId: t.warehouseId,
          quantity: 5,
          reason: "ManualAdjustment",
        })
      )
    ).rejects.toThrow(/justification/i);
  });
});

describe("UBL generation and clearance pre-flight", () => {
  const base = {
    number: "FA-2026-00001",
    issueDate: new Date("2026-03-15"),
    dueDate: new Date("2026-04-14"),
    currency: "MAD",
    supplier: {
      name: "Vendeur SARL",
      ice: "001234567890001",
      taxId: "12345678",
      rc: "9876",
      address: "Anfa",
      city: "Casablanca",
      country: "MA",
    },
    customer: {
      name: "Acheteur SARL",
      ice: "002222222222222",
      taxId: "87654321",
      rc: "1234",
      address: "Agdal",
      city: "Rabat",
      country: "MA",
    },
    lines: [
      {
        position: 1,
        description: "Produit A",
        quantity: "2.000",
        unitCode: "PCE",
        unitPrice: "100.00",
        lineExtensionAmount: "200.00",
        taxPercent: "20.00",
        taxAmount: "40.00",
      },
    ],
    taxSubtotals: [{ taxableAmount: "200.00", taxAmount: "40.00", percent: "20.00" }],
    lineExtensionAmount: "200.00",
    taxExclusiveAmount: "200.00",
    taxInclusiveAmount: "240.00",
    payableAmount: "240.00",
  };

  it("produces UBL 2.1 carrying the identifiers the platform validates", () => {
    const xml = buildUbl(base);
    expect(xml).toContain("<cbc:UBLVersionID>2.1</cbc:UBLVersionID>");
    expect(xml).toContain('schemeID="ICE">001234567890001<');
    expect(xml).toContain("<cbc:ID>FA-2026-00001</cbc:ID>");
    expect(xml).toContain("<cbc:IssueDate>2026-03-15</cbc:IssueDate>");
    expect(xml).toContain('<cbc:PayableAmount currencyID="MAD">240.00</cbc:PayableAmount>');
  });

  it("refuses a customer with no ICE, naming the field", () => {
    expect(() => validateForClearance({ ...base, customer: { ...base.customer, ice: null } }))
      .toThrow(UblValidationError);

    try {
      validateForClearance({ ...base, customer: { ...base.customer, ice: null } });
    } catch (e) {
      expect((e as UblValidationError).field).toBe("customer.ice");
    }
  });

  it("refuses a draft number", () => {
    expect(() => validateForClearance({ ...base, number: "BROUILLON-XYZ" })).toThrow(/non attribué/i);
  });

  it("refuses totals that disagree with the lines", () => {
    expect(() =>
      validateForClearance({ ...base, taxExclusiveAmount: "199.00" })
    ).toThrow(/ne correspond pas/i);
  });

  it("escapes XML metacharacters in party names", () => {
    const xml = buildUbl({
      ...base,
      customer: { ...base.customer, name: 'Ali & Fils <"SARL">' },
    });
    expect(xml).toContain("Ali &amp; Fils &lt;&quot;SARL&quot;&gt;");
    expect(xml).not.toContain('<"SARL">');
  });
});
