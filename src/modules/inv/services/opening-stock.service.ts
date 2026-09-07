import type { Tx } from "@/shared/db/prisma";
import { dec, type Numeric } from "@/shared/money";
import { domainError } from "@/shared/errors";
import { applyMovement } from "./stock-ledger.service";
import { audit } from "@/modules/platform/services/audit.service";

export interface RecordOpeningStockInput {
  tenantId: string;
  productId: string;
  warehouseId: string;
  quantity: Numeric;
  unitCost?: Numeric;
  userId?: string | null;
  importJobId?: string;
  date?: Date;
}

/**
 * Dedicated canonical service for recording initial stock / opening inventory during imports.
 * Never performs direct writes to StockLevel, ValuationLayer, or StockMovement.
 * Routes through `applyMovement` to maintain invariants I5 and I6.
 */
export async function recordOpeningStock(tx: Tx, input: RecordOpeningStockInput) {
  const { tenantId, productId, warehouseId, userId, importJobId } = input;
  const qty = dec(input.quantity);

  if (qty.lessThanOrEqualTo(0)) {
    throw domainError("VALIDATION_FAILED", "La quantité de stock initial doit être strictement supérieure à zéro.");
  }

  // 1. Verify warehouse belongs to this tenant
  const warehouse = await tx.warehouse.findFirst({
    where: { id: warehouseId, tenantId },
    select: { id: true, name: true },
  });
  if (!warehouse) {
    throw domainError("NOT_FOUND", `Entrepôt introuvable pour ce tenant : ${warehouseId}`);
  }

  // 2. Apply movement through canonical stock ledger engine
  const movement = await applyMovement(tx, {
    tenantId,
    productId,
    warehouseId,
    quantity: qty,
    reason: "ManualAdjustment",
    note: `Reprise de stock initial — Import ${importJobId || ""}`.trim(),
    unitCost: input.unitCost,
    sourceDocumentType: "ImportJob",
    sourceDocumentId: importJobId ?? undefined,
    userId: userId ?? null,
    date: input.date ?? new Date(),
  });

  if (!movement) {
    throw domainError("VALIDATION_FAILED", "Impossible de générer le mouvement de stock pour cet article (non suivi en stock).");
  }

  // 3. Explicit audit log
  await audit(tx, {
    tenantId,
    userId: userId ?? null,
    entityType: "StockMovement",
    entityId: movement.id,
    action: "CREATE",
    diff: {
      productId,
      warehouseId,
      quantity: qty.toFixed(6),
      importJobId: importJobId ?? null,
      reason: "InitialStockImport",
    },
    reason: "Saisie de stock initial lors de l'importation de produits",
  });

  return movement;
}
