import { Prisma } from "@/generated/prisma/client";
import type { Tx } from "@/shared/db/prisma";
import { dec, type Numeric } from "@/shared/money";

/**
 * Inventory costing (blueprint §6.4).
 *
 * Stock has two ledgers: quantity (StockMovement) and value (ValuationLayer).
 * Stock value is SUM(ValuationLayer.value) and must equal the balance of account 3111.
 * `Product.averageCost` is a cache maintained here and nowhere else.
 *
 * AVCO is the default because it is the easiest to explain to an SME owner and does
 * not require layer tracking on every issue. FIFO is available per tenant.
 */

export interface CostingResult {
  unitCost: Prisma.Decimal;
  totalValue: Prisma.Decimal; // signed
}

/** Current quantity on hand across all warehouses, from the movement ledger. */
export async function onHandQuantity(
  tx: Tx,
  tenantId: string,
  productId: string
): Promise<Prisma.Decimal> {
  const rows = await tx.stockMovement.aggregate({
    where: { tenantId, productId },
    _sum: { quantity: true },
  });
  return dec(rows._sum.quantity ?? 0);
}

/** Current stock value from the valuation ledger. */
export async function stockValue(
  tx: Tx,
  tenantId: string,
  productId?: string
): Promise<Prisma.Decimal> {
  const rows = await tx.valuationLayer.aggregate({
    where: { tenantId, ...(productId ? { productId } : {}) },
    _sum: { value: true },
  });
  return dec(rows._sum.value ?? 0);
}

/**
 * Cost of an incoming unit: whatever we paid. Updates the weighted average.
 * Returns the value to book.
 */
export async function costIncoming(
  tx: Tx,
  tenantId: string,
  productId: string,
  quantity: Numeric,
  unitCost: Numeric
): Promise<CostingResult> {
  const qty = dec(quantity);
  const cost = dec(unitCost);
  const value = qty.times(cost);

  const product = await tx.product.findFirstOrThrow({
    where: { id: productId, tenantId },
    select: { averageCost: true },
  });

  const previousQty = await onHandQuantity(tx, tenantId, productId);
  const previousValue = await stockValue(tx, tenantId, productId);

  const newQty = previousQty.plus(qty);
  const newValue = previousValue.plus(value);

  // Weighted average only moves on receipts, and only when the resulting stock is positive.
  const newAverage = newQty.greaterThan(0)
    ? newValue.dividedBy(newQty)
    : dec(product.averageCost);

  await tx.product.update({
    where: { id: productId },
    data: { averageCost: new Prisma.Decimal(newAverage.toFixed(6)) },
  });

  return { unitCost: cost, totalValue: value };
}

/**
 * Cost of an outgoing unit. AVCO uses the running average; FIFO consumes the oldest
 * layers. Negative stock is permitted (operators receive late) but is valued at the
 * last known cost and must be corrected when the real receipt arrives.
 */
export async function costOutgoing(
  tx: Tx,
  tenantId: string,
  productId: string,
  quantity: Numeric,
  method: "AVCO" | "FIFO" | "STANDARD"
): Promise<CostingResult> {
  const qty = dec(quantity).abs();

  const product = await tx.product.findFirstOrThrow({
    where: { id: productId, tenantId },
    select: { averageCost: true, standardCost: true, purchasePrice: true },
  });

  if (method === "STANDARD") {
    const cost = dec(product.standardCost);
    return { unitCost: cost, totalValue: qty.times(cost).negated() };
  }

  if (method === "AVCO") {
    const cost = dec(product.averageCost).isZero()
      ? dec(product.purchasePrice)
      : dec(product.averageCost);
    return { unitCost: cost, totalValue: qty.times(cost).negated() };
  }

  // FIFO: consume the oldest unconsumed layers.
  const layers = await tx.valuationLayer.findMany({
    where: { tenantId, productId, remainingQty: { gt: 0 } },
    orderBy: { createdAt: "asc" },
  });

  let remaining = qty;
  let cost = new Prisma.Decimal(0);

  for (const layer of layers) {
    if (remaining.lessThanOrEqualTo(0)) break;
    const available = dec(layer.remainingQty);
    const take = available.lessThan(remaining) ? available : remaining;
    const layerUnit = dec(layer.unitCost);

    cost = cost.plus(take.times(layerUnit));
    remaining = remaining.minus(take);

    await tx.valuationLayer.update({
      where: { id: layer.id },
      data: {
        remainingQty: new Prisma.Decimal(available.minus(take).toFixed(6)),
        remainingValue: new Prisma.Decimal(
          dec(layer.remainingValue).minus(take.times(layerUnit)).toFixed(6)
        ),
      },
    });
  }

  if (remaining.greaterThan(0)) {
    // Negative stock: value the shortfall at the last known cost.
    const fallback = dec(product.averageCost).isZero()
      ? dec(product.purchasePrice)
      : dec(product.averageCost);
    cost = cost.plus(remaining.times(fallback));
  }

  const unitCost = qty.isZero() ? new Prisma.Decimal(0) : cost.dividedBy(qty);
  return { unitCost, totalValue: cost.negated() };
}
