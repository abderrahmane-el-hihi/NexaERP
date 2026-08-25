"use server";

import { prisma } from "@/shared/db/prisma";
import { getNextSequenceNumber } from "./sequence.service";
import { getTenantId } from "@/lib/auth";

export async function getSalesOrders() {
  const tenantId = await getTenantId();
  return await prisma.salesOrder.findMany({
    where: { tenantId },
    include: { company: true, deliveryNotes: true, invoices: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getSalesOrderPrerequisites() {
  const tenantId = await getTenantId();
  const companies = await prisma.company.findMany({
    where: { tenantId },
    orderBy: { name: "asc" },
  });
  return { companies };
}

export async function createSalesOrderDirect(data: {
  companyId: string;
  subtotal: number;
  tvaAmount: number;
  total: number;
}) {
  const tenantId = await getTenantId();
  const year = new Date().getFullYear();
  const orderNumber = await getNextSequenceNumber(tenantId, "SalesOrder", year);

  return await prisma.salesOrder.create({
    data: {
      tenantId,
      number: orderNumber,
      companyId: data.companyId,
      subtotal: data.subtotal,
      tvaAmount: data.tvaAmount,
      total: data.total,
      status: "Confirmed",
    },
  });
}

export async function convertDevisToOrder(devisId: string) {
  const tenantId = await getTenantId();
  return await prisma.$transaction(async (tx) => {
    const devis = await tx.devis.findUnique({
      where: { id: devisId, tenantId },
      include: { lines: true },
    });

    if (!devis) throw new Error("Devis not found");
    if (devis.status === "Converted") throw new Error("Devis is already converted");

    const year = new Date().getFullYear();
    const orderNumber = await getNextSequenceNumber(tenantId, "SalesOrder", year);

    // Create the order
    const order = await tx.salesOrder.create({
      data: {
        tenantId,
        number: orderNumber,
        companyId: devis.companyId,
        devisId: devis.id,
        subtotal: devis.subtotal,
        tvaAmount: devis.tvaAmount,
        total: devis.total,
        status: "Confirmed",
      },
    });

    await tx.devis.update({
      where: { id: devisId },
      data: { status: "Converted" },
    });

    return order;
  });
}
