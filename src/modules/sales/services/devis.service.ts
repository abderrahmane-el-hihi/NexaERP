"use server";

import { prisma } from "@/shared/db/prisma";
import { getTenantId } from "@/lib/auth";

import { getNextSequenceNumber } from "./sequence.service";

export async function getDevis() {
  const tenantId = await getTenantId();
  return await prisma.devis.findMany({
    where: { tenantId },
    include: { company: true, lines: true, tenant: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function createDevis(data: any, lines: any[]) {
  const tenantId = await getTenantId();
  const year = new Date().getFullYear();
  const number = await getNextSequenceNumber(tenantId, "Devis", year);

  return await prisma.$transaction(async (tx) => {
    let defaultProduct = await tx.product.findFirst({ where: { tenantId } });
    if (!defaultProduct) {
      defaultProduct = await tx.product.create({
        data: {
          tenantId,
          name: "Standard Item",
          type: "service",
          salesPrice: 0,
        },
      });
    }

    return await tx.devis.create({
      data: {
        tenantId,
        number,
        ...data,
        lines: {
          create: lines.map((line) => {
            const qty = Number(line.quantity) || 1;
            const price = Number(line.unitPrice) || 0;
            const discount = Number(line.discount ?? line.discountPercent ?? 0);
            const tva = Number(line.tvaRate ?? 20);
            const lineTotal = qty * price * (1 - discount / 100);

            return {
              tenantId,
              productId: line.productId || defaultProduct.id,
              description: line.description || "Item",
              quantity: qty,
              unitPrice: price,
              tvaRate: tva,
              discountPercent: discount,
              lineTotal,
            };
          }),
        },
      },
    });
  });
}
