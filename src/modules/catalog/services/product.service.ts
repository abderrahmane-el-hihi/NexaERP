"use server";

import { Prisma } from "@/generated/prisma/client";
import { withTenant } from "@/shared/db/prisma";
import { getTenantId } from "@/lib/auth";
import { dec, serialize } from "@/shared/money";
import { domainError } from "@/shared/errors";
import { audit } from "@/modules/platform/services/audit.service";

export async function getProducts() {
  const tenantId = await getTenantId();
  const rows = await withTenant(tenantId, (tx) =>
    tx.product.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } })
  );
  return serialize(rows);
}

export interface ProductInput {
  name: string;
  reference?: string;
  description?: string;
  type: string;
  unit: string;
  salesPrice: number | string;
  purchasePrice: number | string;
  tvaRate: number | string;
  trackStock: boolean;
  category?: string;
}

export async function createProduct(data: ProductInput) {
  const tenantId = await getTenantId();

  return withTenant(tenantId, async (tx) => {
    const product = await tx.product.create({
      data: {
        tenantId,
        name: data.name,
        reference: data.reference || null,
        description: data.description ?? null,
        type: data.type,
        unit: data.unit,
        salesPrice: new Prisma.Decimal(dec(data.salesPrice).toFixed(6)),
        purchasePrice: new Prisma.Decimal(dec(data.purchasePrice).toFixed(6)),
        tvaRate: new Prisma.Decimal(dec(data.tvaRate).toFixed(6)),
        trackStock: data.trackStock,
        category: data.category ?? null,
      },
    });
    await audit(tx, { tenantId, entityType: "Product", entityId: product.id, action: "CREATE" });
    return serialize(product);
  });
}

export async function updateProduct(
  id: string,
  data: {
    name: string;
    reference?: string;
    salesPrice: number | string;
    purchasePrice: number | string;
    tvaRate: number | string;
  }
) {
  const tenantId = await getTenantId();

  return withTenant(tenantId, async (tx) => {
    const existing = await tx.product.findFirst({ where: { id, tenantId } });
    if (!existing) throw domainError("NOT_FOUND", "Produit introuvable");

    const product = await tx.product.update({
      where: { id },
      data: {
        name: data.name,
        reference: data.reference || null,
        salesPrice: new Prisma.Decimal(dec(data.salesPrice).toFixed(6)),
        purchasePrice: new Prisma.Decimal(dec(data.purchasePrice).toFixed(6)),
        tvaRate: new Prisma.Decimal(dec(data.tvaRate).toFixed(6)),
      },
    });
    await audit(tx, { tenantId, entityType: "Product", entityId: id, action: "UPDATE" });
    return serialize(product);
  });
}

/**
 * Products referenced by a document are archived, never deleted: an old invoice must
 * still resolve the product it was sold under.
 */
export async function deleteProduct(id: string) {
  const tenantId = await getTenantId();

  return withTenant(tenantId, async (tx) => {
    const product = await tx.product.findFirst({ where: { id, tenantId } });
    if (!product) throw domainError("NOT_FOUND", "Produit introuvable");

    const referenced =
      (await tx.invoiceLine.count({ where: { productId: id } })) +
      (await tx.devisLine.count({ where: { productId: id } })) +
      (await tx.salesOrderLine.count({ where: { productId: id } })) +
      (await tx.purchaseOrderLine.count({ where: { productId: id } })) +
      (await tx.stockMovement.count({ where: { productId: id } }));

    if (referenced > 0) {
      const archived = await tx.product.update({ where: { id }, data: { isActive: false } });
      await audit(tx, {
        tenantId,
        entityType: "Product",
        entityId: id,
        action: "UPDATE",
        reason: "Archivé (référencé par des documents existants)",
      });
      return serialize(archived);
    }

    const removed = await tx.product.delete({ where: { id } });
    await audit(tx, { tenantId, entityType: "Product", entityId: id, action: "DELETE" });
    return serialize(removed);
  });
}
