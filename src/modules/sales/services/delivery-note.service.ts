"use server";

import { Prisma } from "@/generated/prisma/client";
import { withTenant } from "@/shared/db/prisma";
import { getTenantId } from "@/lib/auth";
import { dec, serialize } from "@/shared/money";
import { domainError } from "@/shared/errors";
import { nextNumber } from "@/modules/platform/services/sequence.service";
import { audit } from "@/modules/platform/services/audit.service";
import { applyMovement } from "@/modules/inv/services/stock-ledger.service";

/**
 * Delivery notes (bons de livraison).
 *
 * Stock leaves through `applyMovement` only. The previous version wrote StockMovement
 * and StockLevel by hand with a read-then-write update, which both lost concurrent
 * updates and left the movement unvalued, so cost of sales was never booked.
 */

export async function getDeliveryNotes() {
  const tenantId = await getTenantId();
  const rows = await withTenant(tenantId, (tx) =>
    tx.deliveryNote.findMany({
      where: { tenantId },
      include: {
        warehouse: true,
        lines: { include: { product: true } },
        salesOrder: { include: { company: true, lines: { include: { product: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    })
  );
  return serialize(rows);
}

export async function createDeliveryNoteFromOrder(salesOrderId: string, warehouseId?: string) {
  const tenantId = await getTenantId();

  return withTenant(tenantId, async (tx) => {
    const order = await tx.salesOrder.findFirst({
      where: { id: salesOrderId, tenantId },
      include: { lines: true, company: true },
    });
    if (!order) throw domainError("NOT_FOUND", "Commande introuvable");
    if (order.status === "Cancelled") {
      throw domainError("INVALID_STATE_TRANSITION", "Commande annulée");
    }
    if (order.lines.length === 0) {
      throw domainError("VALIDATION_FAILED", "Commande sans ligne: rien à livrer");
    }

    const warehouse = warehouseId
      ? await tx.warehouse.findFirst({ where: { id: warehouseId, tenantId } })
      : await tx.warehouse.findFirst({ where: { tenantId }, orderBy: { isDefault: "desc" } });

    if (!warehouse) {
      throw domainError(
        "VALIDATION_FAILED",
        "Aucun entrepôt configuré. Créez un entrepôt avant de livrer."
      );
    }

    // Only what is still owed on each line.
    const pending = order.lines
      .map((l) => ({ line: l, remaining: dec(l.quantity).minus(dec(l.deliveredQty)) }))
      .filter((x) => x.remaining.greaterThan(0));

    if (pending.length === 0) {
      throw domainError("INVALID_STATE_TRANSITION", "Commande déjà entièrement livrée");
    }

    const number = await nextNumber(tx, tenantId, "DeliveryNote");

    const bl = await tx.deliveryNote.create({
      data: {
        tenantId,
        number,
        salesOrderId: order.id,
        warehouseId: warehouse.id,
        status: "Delivered",
        lines: {
          create: pending.map(({ line, remaining }, index) => ({
            tenantId,
            salesOrderLineId: line.id,
            productId: line.productId,
            description: line.description,
            quantity: new Prisma.Decimal(remaining.toFixed(6)),
            position: index,
          })),
        },
      },
    });

    for (const { line, remaining } of pending) {
      await applyMovement(tx, {
        tenantId,
        productId: line.productId,
        warehouseId: warehouse.id,
        quantity: remaining.negated(),
        reason: "SalesDelivery",
        sourceDocumentType: "DeliveryNote",
        sourceDocumentId: bl.id,
        note: `Livraison ${number} — commande ${order.number} (${order.company.name})`,
      });

      await tx.salesOrderLine.update({
        where: { id: line.id },
        data: { deliveredQty: new Prisma.Decimal(dec(line.quantity).toFixed(6)) },
      });
    }

    const refreshed = await tx.salesOrderLine.findMany({ where: { salesOrderId: order.id } });
    const fullyDelivered = refreshed.every((l) =>
      dec(l.deliveredQty).greaterThanOrEqualTo(dec(l.quantity))
    );

    await tx.salesOrder.update({
      where: { id: order.id },
      data: { status: fullyDelivered ? "Delivered" : "PartiallyDelivered" },
    });

    await audit(tx, {
      tenantId,
      entityType: "DeliveryNote",
      entityId: bl.id,
      action: "POST",
      diff: { number, salesOrder: order.number, lines: pending.length },
    });

    return serialize(await tx.deliveryNote.findUniqueOrThrow({ where: { id: bl.id } }));
  });
}
