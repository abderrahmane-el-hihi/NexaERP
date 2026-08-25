"use server";

import { prisma } from "@/shared/db/prisma";
import { getTenantId } from "@/lib/auth";

export async function getProducts() {
  const tenantId = await getTenantId();
  return await prisma.product.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createProduct(
  data: {
    name: string;
    reference?: string;
    description?: string;
    type: string;
    unit: string;
    salesPrice: number;
    purchasePrice: number;
    tvaRate: number;
    trackStock: boolean;
    category?: string;
  }
) {
  const tenantId = await getTenantId();
  return await prisma.product.create({
    data: {
      tenantId,
      ...data,
    },
  });
}

export async function updateProduct(
  id: string,
  data: {
    name: string;
    reference?: string;
    salesPrice: number;
    purchasePrice: number;
    tvaRate: number;
  }
) {
  const tenantId = await getTenantId();
  return await prisma.product.update({
    where: { id, tenantId },
    data,
  });
}

export async function deleteProduct(id: string) {
  const tenantId = await getTenantId();
  return await prisma.product.delete({
    where: { id, tenantId },
  });
}
