"use server";

import { prisma } from "@/shared/db/prisma";
import { getNextSequenceNumber } from "./sequence.service";
import { getTenantId } from "@/lib/auth";

export async function getDeliveryNotes() {
  const tenantId = await getTenantId();
  return await prisma.deliveryNote.findMany({
    where: { tenantId },
    include: {
      salesOrder: {
        include: {
          company: true,
          devis: { include: { lines: { include: { product: true } } } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Creates a Delivery Note (Bon de Livraison) from a Sales Order
 * Automatically appends StockMovement (OUT) to deduct physical warehouse stock.
 */
export async function createDeliveryNoteFromOrder(salesOrderId: string, warehouseId?: string) {
  const tenantId = await getTenantId();
  const year = new Date().getFullYear();
  const number = await getNextSequenceNumber(tenantId, "DeliveryNote", year);

  return await prisma.$transaction(async (tx) => {
    const order = await tx.salesOrder.findUnique({
      where: { id: salesOrderId, tenantId },
      include: {
        devis: { include: { lines: true } },
        company: true,
      },
    });

    if (!order) throw new Error("Sales Order not found");

    // Target default warehouse
    let targetWarehouse = warehouseId
      ? await tx.warehouse.findUnique({ where: { id: warehouseId, tenantId } })
      : await tx.warehouse.findFirst({ where: { tenantId } });

    if (!targetWarehouse) {
      targetWarehouse = await tx.warehouse.create({
        data: {
          tenantId,
          name: "Entrepôt Principal",
          isDefault: true,
          address: "Siège Social, Casablanca",
        },
      });
    }

    const bl = await tx.deliveryNote.create({
      data: {
        tenantId,
        number,
        salesOrderId: order.id,
        warehouseId: targetWarehouse.id,
        status: "Delivered",
      },
    });

    // Deduct physical inventory for each product line
    if (order.devis?.lines) {
      for (const line of order.devis.lines) {
        // Log StockMovement OUT (negative quantity)
        await tx.stockMovement.create({
          data: {
            tenantId,
            productId: line.productId,
            warehouseId: targetWarehouse.id,
            quantity: -Math.abs(line.quantity), // Negative for OUT
            reason: "SalesDelivery",
            sourceDocumentType: "DeliveryNote",
            sourceDocumentId: bl.id,
            note: `Livraison Commande ${order.number} - BL ${number} (${order.company.name})`,
          },
        });

        // Decrement StockLevel
        await tx.stockLevel.upsert({
          where: {
            productId_warehouseId: {
              productId: line.productId,
              warehouseId: targetWarehouse.id,
            },
          },
          update: {
            quantity: {
              decrement: line.quantity,
            },
          },
          create: {
            tenantId,
            productId: line.productId,
            warehouseId: targetWarehouse.id,
            quantity: -line.quantity,
          },
        });
      }
    }

    // Update SalesOrder status
    await tx.salesOrder.update({
      where: { id: salesOrderId },
      data: { status: "Delivered" },
    });

    return bl;
  });
}
