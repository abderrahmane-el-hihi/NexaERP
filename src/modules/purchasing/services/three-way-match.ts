import { Prisma } from "@/generated/prisma/client";
import { dec } from "@/shared/money";

// Pure matching logic, kept out of the "use server" module so it can be exported
// synchronously and unit-tested without a database.

export interface MatchException {
  code: "OVER_BILLED_QTY" | "PRICE_VARIANCE" | "UNEXPECTED_ITEM";
  line: string;
  detail: string;
}

/**
 * Three-way match: purchase order vs goods received vs supplier bill.
 * Returns the exceptions rather than throwing, so the UI can present them and let an
 * authorised user accept a variance with a reason.
 */
export function matchBillAgainstReceipts(
  poLines: Array<{ id: string; description: string; quantity: Prisma.Decimal; receivedQty: Prisma.Decimal; billedQty: Prisma.Decimal; unitPrice: Prisma.Decimal }>,
  billLines: Array<{ purchaseOrderLineId?: string | null; description: string; quantity: Prisma.Decimal | number | string; unitPrice: Prisma.Decimal | number | string }>,
  tolerance = { qty: dec(0), pricePercent: dec(1) }
): MatchException[] {
  const exceptions: MatchException[] = [];
  const byId = new Map(poLines.map((l) => [l.id, l]));

  for (const bl of billLines) {
    const poLine = bl.purchaseOrderLineId ? byId.get(bl.purchaseOrderLineId) : undefined;
    if (!poLine) {
      exceptions.push({
        code: "UNEXPECTED_ITEM",
        line: bl.description,
        detail: "Cet article ne figure pas sur la commande d'achat",
      });
      continue;
    }

    const billable = dec(poLine.receivedQty).minus(dec(poLine.billedQty)).plus(tolerance.qty);
    if (dec(bl.quantity).greaterThan(billable)) {
      exceptions.push({
        code: "OVER_BILLED_QTY",
        line: bl.description,
        detail: `Facturé ${dec(bl.quantity).toFixed(3)} pour ${billable.toFixed(3)} réceptionné et non encore facturé`,
      });
    }

    const poPrice = dec(poLine.unitPrice);
    if (poPrice.greaterThan(0)) {
      const variance = dec(bl.unitPrice).minus(poPrice).abs().dividedBy(poPrice).times(100);
      if (variance.greaterThan(tolerance.pricePercent)) {
        exceptions.push({
          code: "PRICE_VARIANCE",
          line: bl.description,
          detail: `Prix facturé ${dec(bl.unitPrice).toFixed(2)} contre ${poPrice.toFixed(2)} commandé (${variance.toFixed(1)}%)`,
        });
      }
    }
  }

  return exceptions;
}
