import { describe, it, expect, beforeEach, vi } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import { withTenant } from "@/shared/db/prisma";
import { createTestTenant, type TestTenant } from "./helpers/factory";

let current: TestTenant;

vi.mock("@/lib/auth", () => ({
  getTenantId: async () => current.tenantId,
  getCurrentUser: async () => ({ id: current.userId }),
  getUserTenants: async () => ({ activeTenantId: current.tenantId, tenants: [] }),
}));

const { checkTenantInvariants, summarize } = await import(
  "@/modules/platform/services/invariant-checker.service"
);
const { createInvoice, postInvoice } = await import("@/modules/sales/services/invoice.service");
const { payInvoice } = await import("@/modules/finance/services/payment.service");

beforeEach(async () => {
  current = await createTestTenant();
});

describe("invariant checker", () => {
  it("reports a clean tenant after a full cycle", async () => {
    const invoice = await postInvoice(
      (await createInvoice({
        companyId: current.companyId,
        lines: [
          { productId: current.productId, description: "P", quantity: 2, unitPrice: 100, tvaRate: 20 },
        ],
      })).id
    );
    await payInvoice(invoice.id, { amount: 240, method: "virement" });

    const report = await checkTenantInvariants(current.tenantId);
    expect(report.violations).toEqual([]);
    expect(report.ok).toBe(true);
  });

  it("detects a corrupted stock level cache", async () => {
    const { applyMovement } = await import("@/modules/inv/services/stock-ledger.service");
    await withTenant(current.tenantId, (tx) =>
      applyMovement(tx, {
        tenantId: current.tenantId,
        productId: current.productId,
        warehouseId: current.warehouseId,
        quantity: 5,
        unitCost: "60",
        reason: "PurchaseReceipt",
      })
    );

    await withTenant(current.tenantId, (tx) =>
      tx.stockLevel.updateMany({
        where: { tenantId: current.tenantId },
        data: { quantity: new Prisma.Decimal("42") },
      })
    );

    const report = await checkTenantInvariants(current.tenantId);
    expect(report.ok).toBe(false);
    expect(report.violations.map((v) => v.code)).toContain("STOCK_LEVEL_DRIFT");
  });

  it("detects an invoice residual that no longer matches its allocations", async () => {
    const invoice = await postInvoice(
      (await createInvoice({
        companyId: current.companyId,
        lines: [{ description: "P", quantity: 1, unitPrice: 1000, tvaRate: 0 }],
      })).id
    );

    await withTenant(current.tenantId, (tx) =>
      tx.invoice.update({
        where: { id: invoice.id },
        data: { amountDue: new Prisma.Decimal("1") },
      })
    );

    const report = await checkTenantInvariants(current.tenantId);
    expect(report.violations.map((v) => v.code)).toContain("INVOICE_RESIDUAL_DRIFT");
  });

  it("summarises a set of reports into a health score", async () => {
    const clean = await checkTenantInvariants(current.tenantId);
    const summary = summarize([clean]);
    expect(summary.tenantsChecked).toBe(1);
    expect(summary.healthScore).toBe(100);
  });
});
