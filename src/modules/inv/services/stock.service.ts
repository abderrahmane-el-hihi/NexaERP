"use server";

import { prisma } from "@/shared/db/prisma";
import { getTenantId } from "@/lib/auth";

export async function getStockLevels() {
  const tenantId = await getTenantId();
  return await prisma.stockLevel.findMany({
    where: { tenantId },
    include: { product: true, warehouse: true },
    orderBy: { product: { name: "asc" } },
  });
}

export async function getWarehouses() {
  const tenantId = await getTenantId();
  return await prisma.warehouse.findMany({
    where: { tenantId },
    orderBy: { name: "asc" },
  });
}

/**
 * Core transactional method to record a stock movement.
 * Always logs the movement in the append-only ledger and updates the derived StockLevel.
 */
export async function recordStockMovement(
  data: {
    productId: string;
    warehouseId: string;
    quantity: number;
    reason: "SalesDelivery" | "PurchaseReceipt" | "ManualAdjustment";
    note?: string;
    sourceDocumentType?: string;
    sourceDocumentId?: string;
  }
) {
  const tenantId = await getTenantId();
  if (data.reason === "ManualAdjustment" && !data.note) {
    throw new Error("Manual adjustments require a note for audit purposes.");
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Record the movement in the ledger
    const movement = await tx.stockMovement.create({
      data: {
        tenantId,
        ...data,
      },
    });

    // 2. Update or create the current StockLevel (derived cache)
    const currentLevel = await tx.stockLevel.findUnique({
      where: {
        productId_warehouseId: {
          productId: data.productId,
          warehouseId: data.warehouseId,
        },
      },
    });

    if (currentLevel) {
      await tx.stockLevel.update({
        where: { id: currentLevel.id },
        data: { quantity: currentLevel.quantity + data.quantity },
      });
    } else {
      await tx.stockLevel.create({
        data: {
          tenantId,
          productId: data.productId,
          warehouseId: data.warehouseId,
          quantity: data.quantity,
        },
      });
    }

    return movement;
  });
}
