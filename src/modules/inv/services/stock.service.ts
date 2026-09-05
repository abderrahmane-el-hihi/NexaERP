"use server";

import { withTenant } from "@/shared/db/prisma";
import { getTenantId } from "@/lib/auth";
import { serialize } from "@/shared/money";
import { applyMovement, type MovementReason } from "./stock-ledger.service";

/**
 * Read side of inventory plus the single entry point the UI uses to move stock.
 * All writing happens in stock-ledger.service, which is the only module allowed to
 * touch StockMovement, ValuationLayer and StockLevel.
 */

export async function getStockLevels() {
  const tenantId = await getTenantId();
  const rows = await withTenant(tenantId, (tx) =>
    tx.stockLevel.findMany({
      where: { tenantId },
      include: { product: true, warehouse: true },
      orderBy: { product: { name: "asc" } },
    })
  );
  return serialize(rows);
}

export async function getWarehouses() {
  const tenantId = await getTenantId();
  const rows = await withTenant(tenantId, (tx) =>
    tx.warehouse.findMany({ where: { tenantId }, orderBy: { name: "asc" } })
  );
  return serialize(rows);
}

export async function getStockMovements(productId?: string) {
  const tenantId = await getTenantId();
  const rows = await withTenant(tenantId, (tx) =>
    tx.stockMovement.findMany({
      where: { tenantId, ...(productId ? { productId } : {}) },
      include: { product: true, warehouse: true },
      orderBy: { date: "desc" },
      take: 200,
    })
  );
  return serialize(rows);
}

export async function recordStockMovement(data: {
  productId: string;
  warehouseId: string;
  quantity: number | string;
  reason: MovementReason;
  note?: string;
  unitCost?: number | string;
  sourceDocumentType?: string;
  sourceDocumentId?: string;
}) {
  const tenantId = await getTenantId();
  const movement = await withTenant(tenantId, (tx) =>
    applyMovement(tx, { tenantId, ...data })
  );
  return serialize(movement);
}
