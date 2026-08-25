"use server";

import { prisma } from "@/shared/db/prisma";
import { getTenantId } from "@/lib/auth";

export async function getCompanies(type?: string) {
  const tenantId = await getTenantId();
  return await prisma.company.findMany({
    where: { 
      tenantId,
      ...(type && type !== "All" ? { type: { equals: type, mode: "insensitive" } } : {})
    },
    orderBy: { name: "asc" }
  });
}

export async function createCompany(
  data: { 
    name: string; 
    type: string; 
    ICE?: string;
    IF?: string;
    RC?: string;
    city?: string;
    address?: string;
    defaultPaymentTermsDays?: number;
  }
) {
  const tenantId = await getTenantId();
  return await prisma.company.create({
    data: {
      tenantId,
      ...data
    }
  });
}

export async function updateCompany(
  id: string,
  data: {
    name: string;
    type: string;
    ICE?: string;
    IF?: string;
    RC?: string;
    city?: string;
    address?: string;
  }
) {
  const tenantId = await getTenantId();
  return await prisma.company.update({
    where: { id, tenantId },
    data,
  });
}
