"use server";

import { prisma } from "@/shared/db/prisma";
import { getTenantId } from "@/lib/auth";

export async function getContacts() {
  const tenantId = await getTenantId();
  return await prisma.contact.findMany({
    where: { tenantId },
    include: { company: true },
    orderBy: { createdAt: "desc" }
  });
}

export async function createContact(
  data: { 
    firstName: string; 
    lastName: string; 
    email?: string;
    phone?: string;
    whatsapp?: string;
    jobTitle?: string;
    notes?: string;
    companyId?: string;
  }
) {
  const tenantId = await getTenantId();
  return await prisma.contact.create({
    data: {
      tenantId,
      ...data
    }
  });
}

export async function updateContact(
  id: string,
  data: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    jobTitle?: string;
    companyId?: string;
  }
) {
  const tenantId = await getTenantId();
  return await prisma.contact.update({
    where: { id, tenantId },
    data,
  });
}
