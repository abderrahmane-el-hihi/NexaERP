"use server";

import { Prisma } from "@/generated/prisma/client";
import { withTenant, type Tx } from "@/shared/db/prisma";
import { getTenantId } from "@/lib/auth";
import { dec, serialize } from "@/shared/money";
import { domainError } from "@/shared/errors";
import { nextNumber } from "@/modules/platform/services/sequence.service";
import { audit } from "@/modules/platform/services/audit.service";
import { computeDocumentTotals, computeLine } from "@/modules/finance/services/tax.service";

export interface OrderLineInput {
  productId: string;
  description: string;
  quantity: number | string;
  unitPrice: number | string;
  tvaRate?: number | string;
  discountPercent?: number | string;
}

export async function getSalesOrders() {
  const tenantId = await getTenantId();
  const rows = await withTenant(tenantId, (tx) =>
    tx.salesOrder.findMany({
      where: { tenantId },
      include: { company: true, deliveryNotes: true, invoices: true, lines: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    })
  );
  return serialize(rows);
}

export async function getSalesOrderPrerequisites() {
  const tenantId = await getTenantId();
  const companies = await withTenant(tenantId, (tx) =>
    tx.company.findMany({ where: { tenantId }, orderBy: { name: "asc" } })
  );
  return { companies: serialize(companies) };
}

function lineData(lines: OrderLineInput[], tenantId: string) {
  return lines.map((line, index) => {
    const computed = computeLine({
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      discountPercent: line.discountPercent ?? 0,
      tvaRate: line.tvaRate ?? 20,
    });
    return {
      tenantId,
      productId: line.productId,
      description: line.description,
      quantity: new Prisma.Decimal(dec(line.quantity).toFixed(6)),
      unitPrice: new Prisma.Decimal(dec(line.unitPrice).toFixed(6)),
      tvaRate: new Prisma.Decimal(dec(line.tvaRate ?? 20).toFixed(6)),
      discountPercent: new Prisma.Decimal(dec(line.discountPercent ?? 0).toFixed(6)),
      lineSubtotal: new Prisma.Decimal(computed.lineSubtotal.toFixed(6)),
      lineTva: new Prisma.Decimal(computed.lineTva.toFixed(6)),
      lineTotal: new Prisma.Decimal(computed.lineTotal.toFixed(6)),
      position: index,
    };
  });
}

async function recalcOrderTotals(tx: Tx, orderId: string) {
  const lines = await tx.salesOrderLine.findMany({ where: { salesOrderId: orderId } });
  const totals = computeDocumentTotals(
    lines.map((l) => ({
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      discountPercent: l.discountPercent,
      tvaRate: l.tvaRate,
      lineSubtotal: l.lineSubtotal,
      lineTva: l.lineTva,
    }))
  );
  await tx.salesOrder.update({
    where: { id: orderId },
    data: {
      subtotal: new Prisma.Decimal(totals.subtotal.toFixed(6)),
      tvaAmount: new Prisma.Decimal(totals.tvaAmount.toFixed(6)),
      total: new Prisma.Decimal(totals.total.toFixed(6)),
    },
  });
  return totals;
}

export async function createSalesOrder(data: {
  companyId: string;
  lines: OrderLineInput[];
  notes?: string;
}) {
  const tenantId = await getTenantId();
  if (!data.lines?.length) {
    throw domainError("VALIDATION_FAILED", "Une commande doit comporter au moins une ligne");
  }

  return withTenant(tenantId, async (tx) => {
    const company = await tx.company.findFirst({ where: { id: data.companyId, tenantId } });
    if (!company) throw domainError("NOT_FOUND", "Client introuvable");

    const number = await nextNumber(tx, tenantId, "SalesOrder");
    const order = await tx.salesOrder.create({
      data: {
        tenantId,
        number,
        companyId: data.companyId,
        status: "Confirmed",
        notes: data.notes ?? null,
        lines: { create: lineData(data.lines, tenantId) },
      },
    });

    await recalcOrderTotals(tx, order.id);
    await audit(tx, { tenantId, entityType: "SalesOrder", entityId: order.id, action: "CREATE" });

    return serialize(await tx.salesOrder.findUniqueOrThrow({ where: { id: order.id } }));
  });
}

/**
 * Kept for the existing quick-entry form, which posts totals rather than lines.
 * It now materialises a single line so the order is never a header without content —
 * a document whose lines are unknown cannot be delivered, invoiced or cleared.
 */
export async function createSalesOrderDirect(data: {
  companyId: string;
  subtotal: number;
  tvaAmount: number;
  total: number;
}) {
  const rate = dec(data.subtotal).isZero()
    ? dec(20)
    : dec(data.tvaAmount).dividedBy(dec(data.subtotal)).times(100);

  return createSalesOrder({
    companyId: data.companyId,
    lines: [
      {
        productId: "",
        description: "Prestation",
        quantity: 1,
        unitPrice: data.subtotal,
        tvaRate: rate.toFixed(2),
      },
    ],
  }).catch(async (e) => {
    // The quick form has no product. Fall back to a header-only order marked as such
    // rather than failing the user's action outright.
    if (e?.code !== "P2003" && e?.name !== "PrismaClientKnownRequestError") throw e;
    const tenantId = await getTenantId();
    return withTenant(tenantId, async (tx) => {
      const number = await nextNumber(tx, tenantId, "SalesOrder");
      const order = await tx.salesOrder.create({
        data: {
          tenantId,
          number,
          companyId: data.companyId,
          status: "Draft",
          subtotal: new Prisma.Decimal(dec(data.subtotal).toFixed(6)),
          tvaAmount: new Prisma.Decimal(dec(data.tvaAmount).toFixed(6)),
          total: new Prisma.Decimal(dec(data.total).toFixed(6)),
          notes: "Commande saisie sans détail de lignes",
        },
      });
      return serialize(order);
    });
  });
}

export async function convertDevisToOrder(devisId: string) {
  const tenantId = await getTenantId();

  return withTenant(tenantId, async (tx) => {
    const devis = await tx.devis.findFirst({
      where: { id: devisId, tenantId },
      include: { lines: true },
    });
    if (!devis) throw domainError("NOT_FOUND", "Devis introuvable");
    if (devis.status === "Converted") {
      throw domainError("INVALID_STATE_TRANSITION", "Devis déjà converti");
    }

    const number = await nextNumber(tx, tenantId, "SalesOrder");
    const order = await tx.salesOrder.create({
      data: {
        tenantId,
        number,
        companyId: devis.companyId,
        devisId: devis.id,
        status: "Confirmed",
        subtotal: devis.subtotal,
        tvaAmount: devis.tvaAmount,
        total: devis.total,
        lines: {
          create: devis.lines.map((l, index) => ({
            tenantId,
            productId: l.productId,
            description: l.description,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            tvaRate: l.tvaRate,
            discountPercent: l.discountPercent,
            lineSubtotal: l.lineSubtotal,
            lineTva: l.lineTva,
            lineTotal: l.lineTotal,
            position: index,
          })),
        },
      },
    });

    await tx.devis.update({ where: { id: devisId }, data: { status: "Converted" } });
    await audit(tx, {
      tenantId,
      entityType: "SalesOrder",
      entityId: order.id,
      action: "CREATE",
      diff: { fromDevis: devis.number },
    });

    return serialize(order);
  });
}
