"use server";

import { prisma } from "@/shared/db/prisma";
import { getTenantId } from "@/lib/auth";

export async function getStockAdjustmentPrerequisites() {
  const tenantId = await getTenantId();

  const [products, warehouses] = await Promise.all([
    prisma.product.findMany({
      where: { tenantId, type: "good" },
      orderBy: { name: "asc" },
    }),
    prisma.warehouse.findMany({
      where: { tenantId },
      orderBy: { isDefault: "desc" },
    }),
  ]);

  return { products, warehouses };
}

export async function recordStockAdjustment(data: {
  productId: string;
  warehouseId: string;
  type: "IN" | "OUT";
  quantity: number;
  notes?: string;
}) {
  const tenantId = await getTenantId();
  const qty = Math.max(1, Math.abs(data.quantity));

  return await prisma.$transaction(async (tx) => {
    // 1. Create StockMovement
    const movement = await tx.stockMovement.create({
      data: {
        tenantId,
        productId: data.productId,
        warehouseId: data.warehouseId,
        quantity: data.type === "IN" ? qty : -qty,
        reason: "ManualAdjustment",
        note: data.notes || `Manual Stock ${data.type} Adjustment`,
        sourceDocumentType: "ManualAdjustment",
      },
    });

    // 2. Upsert StockLevel
    const delta = data.type === "IN" ? qty : -qty;

    await tx.stockLevel.upsert({
      where: {
        productId_warehouseId: {
          productId: data.productId,
          warehouseId: data.warehouseId,
        },
      },
      update: {
        quantity: { increment: delta },
      },
      create: {
        tenantId,
        productId: data.productId,
        warehouseId: data.warehouseId,
        quantity: Math.max(0, delta),
      },
    });

    return movement;
  });
}
