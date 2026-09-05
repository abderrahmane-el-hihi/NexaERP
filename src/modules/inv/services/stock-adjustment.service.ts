"use server";

import { withTenant } from "@/shared/db/prisma";
import { getTenantId } from "@/lib/auth";
import { serialize } from "@/shared/money";
import { domainError } from "@/shared/errors";
import { applyMovement } from "./stock-ledger.service";

export async function getStockAdjustmentPrerequisites() {
  const tenantId = await getTenantId();
  const data = await withTenant(tenantId, async (tx) => {
    const [products, warehouses] = await Promise.all([
      tx.product.findMany({
        where: { tenantId, type: "good", isActive: true },
        orderBy: { name: "asc" },
      }),
      tx.warehouse.findMany({ where: { tenantId }, orderBy: { isDefault: "desc" } }),
    ]);
    return { products, warehouses };
  });
  return serialize(data);
}

/**
 * Manual stock adjustment. It goes through the stock ledger like everything else, so
 * the variance is valued and posted to the gain/loss accounts rather than appearing
 * as quantity out of nowhere.
 */
export async function recordStockAdjustment(data: {
  productId: string;
  warehouseId: string;
  type: "IN" | "OUT";
  quantity: number | string;
  notes?: string;
}) {
  const tenantId = await getTenantId();
  const qty = Math.abs(Number(data.quantity));
  if (!Number.isFinite(qty) || qty <= 0) {
    throw domainError("VALIDATION_FAILED", "Quantité invalide");
  }
  if (!data.notes?.trim()) {
    throw domainError(
      "VALIDATION_FAILED",
      "Un ajustement manuel exige une justification (piste d'audit)"
    );
  }

  const movement = await withTenant(tenantId, (tx) =>
    applyMovement(tx, {
      tenantId,
      productId: data.productId,
      warehouseId: data.warehouseId,
      quantity: data.type === "IN" ? qty : -qty,
      reason: "ManualAdjustment",
      note: data.notes,
      sourceDocumentType: "ManualAdjustment",
    })
  );

  return serialize(movement);
}
