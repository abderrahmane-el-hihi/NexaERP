import { randomUUID } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { withPlatformBypass, withTenant, type Tx } from "@/shared/db/prisma";
import { seedAccountingFoundation } from "@/modules/finance/services/coa.service";

/**
 * Test fixtures.
 *
 * Every test gets its own tenant, so tests never interfere and the tenant-isolation
 * tests have a real second tenant to fail against.
 */

export interface TestTenant {
  tenantId: string;
  userId: string;
  companyId: string;
  supplierId: string;
  warehouseId: string;
  productId: string;
}

export async function createTestTenant(options: { costingMethod?: "AVCO" | "FIFO" } = {}): Promise<TestTenant> {
  const tenantId = `t-${randomUUID()}`;
  const userId = `u-${randomUUID()}`;

  await withPlatformBypass(async (tx) => {
    await tx.tenant.create({
      data: {
        id: tenantId,
        name: `Test ${tenantId.slice(0, 8)}`,
        legalName: "Société de Test SARL",
        ICE: "001234567890001",
        IF: "12345678",
        RC: "98765",
        city: "Casablanca",
        address: "Boulevard d'Anfa",
        costingMethod: options.costingMethod ?? "AVCO",
        inventoryPolicy: "Permanent",
      },
    });
    await tx.user.create({
      data: { id: userId, email: `${userId}@test.ma`, name: "Test User" },
    });
    await tx.tenantMembership.create({
      data: { tenantId, userId, role: "Owner", acceptedAt: new Date() },
    });
  });

  const ids = await withTenant(tenantId, async (tx) => {
    await seedAccountingFoundation(tx, tenantId, new Date().getFullYear());

    const company = await tx.company.create({
      data: {
        tenantId,
        name: "Client Test SARL",
        type: "customer",
        ICE: "002222222222222",
        IF: "87654321",
        city: "Casablanca",
        defaultPaymentTermsDays: 30,
      },
    });

    const supplier = await tx.company.create({
      data: {
        tenantId,
        name: "Fournisseur Test SARL",
        type: "supplier",
        ICE: "003333333333333",
        city: "Rabat",
      },
    });

    const warehouse = await tx.warehouse.create({
      data: { tenantId, name: "Entrepôt Principal", isDefault: true },
    });

    const product = await tx.product.create({
      data: {
        tenantId,
        name: "Produit Test",
        reference: `REF-${tenantId.slice(2, 8)}`,
        type: "good",
        unit: "unit",
        salesPrice: new Prisma.Decimal("100"),
        purchasePrice: new Prisma.Decimal("60"),
        tvaRate: new Prisma.Decimal("20"),
        trackStock: true,
      },
    });

    return {
      companyId: company.id,
      supplierId: supplier.id,
      warehouseId: warehouse.id,
      productId: product.id,
    };
  });

  return { tenantId, userId, ...ids };
}

/** Runs a callback with the tenant context — the same path the application uses. */
export function asTenant<T>(tenantId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return withTenant(tenantId, fn);
}

export async function createProduct(
  tenantId: string,
  data: { name: string; purchasePrice?: string; salesPrice?: string; trackStock?: boolean }
) {
  return withTenant(tenantId, (tx) =>
    tx.product.create({
      data: {
        tenantId,
        name: data.name,
        type: "good",
        unit: "unit",
        purchasePrice: new Prisma.Decimal(data.purchasePrice ?? "0"),
        salesPrice: new Prisma.Decimal(data.salesPrice ?? "0"),
        tvaRate: new Prisma.Decimal("20"),
        trackStock: data.trackStock ?? true,
      },
    })
  );
}
