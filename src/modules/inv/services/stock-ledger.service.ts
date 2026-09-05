import { Prisma } from "@/generated/prisma/client";
import type { Tx } from "@/shared/db/prisma";
import { dec, type Numeric } from "@/shared/money";
import { domainError } from "@/shared/errors";
import { postEntry } from "@/modules/finance/services/posting.service";
import { costIncoming, costOutgoing } from "./costing.service";

/**
 * The single writer of stock.
 *
 * Everything that changes stock goes through `applyMovement`. It writes the quantity
 * ledger, the value ledger, the derived level cache and the general ledger in one
 * transaction. No other code may touch StockMovement, ValuationLayer or StockLevel —
 * that rule is what keeps on-hand equal to the sum of movements (I5) and stock value
 * equal to the 3111 balance (I6).
 */

export type MovementReason =
  | "PurchaseReceipt"
  | "SalesDelivery"
  | "ManualAdjustment"
  | "InventoryCount"
  | "CustomerReturn"
  | "SupplierReturn"
  | "Scrap";

export interface MovementInput {
  tenantId: string;
  productId: string;
  warehouseId: string;
  /** Signed: positive for stock coming in, negative for stock going out. */
  quantity: Numeric;
  reason: MovementReason;
  note?: string;
  /** Required for incoming movements: what we actually paid per unit. */
  unitCost?: Numeric;
  sourceDocumentType?: string;
  sourceDocumentId?: string;
  date?: Date;
  userId?: string | null;
  /** Refuses the movement if it would take stock below zero. */
  blockNegative?: boolean;
}

/** Accounting treatment per movement reason, for permanent inventory. */
function postingFor(
  reason: MovementReason,
  incoming: boolean
): { debit: string; credit: string; journal: string; label: string } | null {
  switch (reason) {
    case "PurchaseReceipt":
      // Goods received, supplier invoice not yet arrived.
      return { debit: "3111", credit: "4417", journal: "STK", label: "Réception de marchandises" };
    case "SupplierReturn":
      return { debit: "4417", credit: "3111", journal: "STK", label: "Retour fournisseur" };
    case "SalesDelivery":
      return { debit: "6114", credit: "3111", journal: "STK", label: "Sortie de stock sur vente" };
    case "CustomerReturn":
      return { debit: "3111", credit: "6114", journal: "STK", label: "Retour client" };
    case "Scrap":
      return { debit: "6586", credit: "3111", journal: "STK", label: "Mise au rebut" };
    case "ManualAdjustment":
    case "InventoryCount":
      return incoming
        ? { debit: "3111", credit: "7386", journal: "STK", label: "Écart d'inventaire (gain)" }
        : { debit: "6586", credit: "3111", journal: "STK", label: "Écart d'inventaire (perte)" };
    default:
      return null;
  }
}

/**
 * Atomically adjusts the derived StockLevel cache.
 * A read-then-write in application code loses concurrent updates; this does not.
 */
async function bumpLevel(
  tx: Tx,
  tenantId: string,
  productId: string,
  warehouseId: string,
  quantity: Prisma.Decimal
): Promise<Prisma.Decimal> {
  const rows = await tx.$queryRawUnsafe<{ quantity: string }[]>(
    `
    INSERT INTO "StockLevel" ("id", "tenantId", "productId", "warehouseId", "quantity", "updatedAt")
    VALUES (gen_random_uuid()::text, $1, $2, $3, $4::numeric, now())
    ON CONFLICT ("productId", "warehouseId")
    DO UPDATE SET "quantity" = "StockLevel"."quantity" + EXCLUDED."quantity", "updatedAt" = now()
    RETURNING "quantity"
    `,
    tenantId,
    productId,
    warehouseId,
    quantity.toFixed(6)
  );
  return dec(rows[0]?.quantity ?? 0);
}

export async function applyMovement(tx: Tx, input: MovementInput) {
  const quantity = dec(input.quantity);
  if (quantity.isZero()) {
    throw domainError("VALIDATION_FAILED", "Un mouvement de stock ne peut pas être nul");
  }
  if (input.reason === "ManualAdjustment" && !input.note) {
    throw domainError(
      "VALIDATION_FAILED",
      "Un ajustement manuel exige une justification (piste d'audit)"
    );
  }

  const tenant = await tx.tenant.findFirstOrThrow({
    where: { id: input.tenantId },
    select: { costingMethod: true, inventoryPolicy: true },
  });

  const product = await tx.product.findFirstOrThrow({
    where: { id: input.productId, tenantId: input.tenantId },
    select: { id: true, name: true, trackStock: true, type: true, purchasePrice: true },
  });

  // Services and untracked products never move stock.
  if (!product.trackStock || product.type === "service") {
    return null;
  }

  const incoming = quantity.isPositive();
  const date = input.date ?? new Date();

  if (input.blockNegative && !incoming) {
    const level = await tx.stockLevel.findUnique({
      where: { productId_warehouseId: { productId: input.productId, warehouseId: input.warehouseId } },
      select: { quantity: true },
    });
    const available = dec(level?.quantity ?? 0);
    if (available.lessThan(quantity.abs())) {
      throw domainError(
        "INSUFFICIENT_STOCK",
        `Stock insuffisant pour ${product.name}: disponible ${available.toFixed(3)}, demandé ${quantity.abs().toFixed(3)}`,
        { productId: product.id, available: available.toFixed(3), requested: quantity.abs().toFixed(3) }
      );
    }
  }

  const costing = incoming
    ? await costIncoming(
        tx,
        input.tenantId,
        input.productId,
        quantity,
        input.unitCost ?? product.purchasePrice
      )
    : await costOutgoing(
        tx,
        input.tenantId,
        input.productId,
        quantity,
        tenant.costingMethod as "AVCO" | "FIFO" | "STANDARD"
      );

  const movement = await tx.stockMovement.create({
    data: {
      tenantId: input.tenantId,
      productId: input.productId,
      warehouseId: input.warehouseId,
      quantity: new Prisma.Decimal(quantity.toFixed(6)),
      reason: input.reason,
      note: input.note ?? null,
      unitCost: new Prisma.Decimal(costing.unitCost.toFixed(6)),
      totalValue: new Prisma.Decimal(costing.totalValue.toFixed(6)),
      sourceDocumentType: input.sourceDocumentType ?? null,
      sourceDocumentId: input.sourceDocumentId ?? null,
      date,
    },
  });

  await tx.valuationLayer.create({
    data: {
      tenantId: input.tenantId,
      productId: input.productId,
      stockMovementId: movement.id,
      quantity: new Prisma.Decimal(quantity.toFixed(6)),
      unitCost: new Prisma.Decimal(costing.unitCost.toFixed(6)),
      value: new Prisma.Decimal(costing.totalValue.toFixed(6)),
      remainingQty: incoming ? new Prisma.Decimal(quantity.toFixed(6)) : new Prisma.Decimal(0),
      remainingValue: incoming
        ? new Prisma.Decimal(costing.totalValue.toFixed(6))
        : new Prisma.Decimal(0),
    },
  });

  await bumpLevel(tx, input.tenantId, input.productId, input.warehouseId, quantity);

  // Permanent inventory books the value change as it happens. Intermittent inventory
  // leaves the ledger alone and adjusts once per period at the close.
  const value = costing.totalValue.abs();
  if (tenant.inventoryPolicy === "Permanent" && !value.isZero()) {
    const rule = postingFor(input.reason, incoming);
    if (rule) {
      const entry = await postEntry(tx, {
        tenantId: input.tenantId,
        date,
        description: `${rule.label} — ${product.name}`,
        journalCode: rule.journal,
        sourceType: "StockMovement",
        sourceId: movement.id,
        userId: input.userId,
        lines: [
          { accountCode: rule.debit, debit: value, description: rule.label },
          { accountCode: rule.credit, credit: value, description: rule.label },
        ],
      });
      await tx.stockMovement.update({
        where: { id: movement.id },
        data: { journalEntryId: entry.id },
      });
    }
  }

  return movement;
}

/**
 * Rebuilds the StockLevel cache from the movement ledger.
 * Used by the invariant checker and after any data repair.
 */
export async function rebuildStockLevels(tx: Tx, tenantId: string): Promise<number> {
  const totals = await tx.stockMovement.groupBy({
    by: ["productId", "warehouseId"],
    where: { tenantId },
    _sum: { quantity: true },
  });

  await tx.stockLevel.deleteMany({ where: { tenantId } });

  if (totals.length === 0) return 0;

  await tx.stockLevel.createMany({
    data: totals.map((t) => ({
      tenantId,
      productId: t.productId,
      warehouseId: t.warehouseId,
      quantity: new Prisma.Decimal(dec(t._sum.quantity ?? 0).toFixed(6)),
    })),
  });

  return totals.length;
}
