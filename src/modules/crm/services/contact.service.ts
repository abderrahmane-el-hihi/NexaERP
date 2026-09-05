"use server";

import { withTenant } from "@/shared/db/prisma";
import { getTenantId } from "@/lib/auth";
import { serialize } from "@/shared/money";
import { domainError } from "@/shared/errors";

export async function getContacts() {
  const tenantId = await getTenantId();
  const rows = await withTenant(tenantId, (tx) =>
    tx.contact.findMany({
      where: { tenantId },
      include: { company: true },
      orderBy: { createdAt: "desc" },
      take: 500,
    })
  );
  return serialize(rows);
}

export interface ContactInput {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  jobTitle?: string;
  notes?: string;
  companyId?: string;
}

export async function createContact(data: ContactInput) {
  const tenantId = await getTenantId();
  return withTenant(tenantId, async (tx) => {
    if (data.companyId) {
      const company = await tx.company.findFirst({ where: { id: data.companyId, tenantId } });
      if (!company) throw domainError("NOT_FOUND", "Société introuvable");
    }
    const contact = await tx.contact.create({
      data: {
        tenantId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email || null,
        phone: data.phone || null,
        whatsapp: data.whatsapp || null,
        jobTitle: data.jobTitle || null,
        notes: data.notes || null,
        companyId: data.companyId || null,
      },
    });
    return serialize(contact);
  });
}

export async function updateContact(id: string, data: ContactInput) {
  const tenantId = await getTenantId();
  return withTenant(tenantId, async (tx) => {
    const existing = await tx.contact.findFirst({ where: { id, tenantId } });
    if (!existing) throw domainError("NOT_FOUND", "Contact introuvable");
    const contact = await tx.contact.update({
      where: { id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email || null,
        phone: data.phone || null,
        jobTitle: data.jobTitle || null,
        companyId: data.companyId || null,
      },
    });
    return serialize(contact);
  });
}
