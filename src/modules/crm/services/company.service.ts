"use server";

import { withTenant } from "@/shared/db/prisma";
import { getTenantId } from "@/lib/auth";
import { serialize } from "@/shared/money";
import { domainError } from "@/shared/errors";
import { audit } from "@/modules/platform/services/audit.service";

export async function getCompanies(type?: string) {
  const tenantId = await getTenantId();
  const rows = await withTenant(tenantId, (tx) =>
    tx.company.findMany({
      where: {
        tenantId,
        ...(type && type !== "All" ? { type: { equals: type, mode: "insensitive" } } : {}),
      },
      orderBy: { name: "asc" },
    })
  );
  return serialize(rows);
}

export interface CompanyInput {
  name: string;
  type: string;
  ICE?: string;
  IF?: string;
  RC?: string;
  city?: string;
  address?: string;
  email?: string;
  phone?: string;
  defaultPaymentTermsDays?: number;
}

/**
 * Warns on a likely duplicate rather than blocking: the ICE is the strongest signal,
 * but a salesperson mid-quote must never be stopped by master data hygiene.
 */
async function findDuplicate(
  tx: Parameters<Parameters<typeof withTenant>[1]>[0],
  tenantId: string,
  input: CompanyInput,
  excludeId?: string
) {
  if (!input.ICE) return null;
  return tx.company.findFirst({
    where: {
      tenantId,
      ICE: input.ICE,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true, name: true },
  });
}

export async function createCompany(data: CompanyInput) {
  const tenantId = await getTenantId();

  return withTenant(tenantId, async (tx) => {
    const duplicate = await findDuplicate(tx, tenantId, data);
    if (duplicate) {
      throw domainError(
        "DUPLICATE_DOCUMENT",
        `Un tiers avec le même ICE existe déjà: ${duplicate.name}`,
        { existingId: duplicate.id, existingName: duplicate.name }
      );
    }

    const company = await tx.company.create({
      data: {
        tenantId,
        name: data.name,
        type: data.type,
        ICE: data.ICE || null,
        IF: data.IF || null,
        RC: data.RC || null,
        city: data.city || null,
        address: data.address || null,
        email: data.email || null,
        phone: data.phone || null,
        defaultPaymentTermsDays: data.defaultPaymentTermsDays ?? 30,
      },
    });

    await audit(tx, { tenantId, entityType: "Company", entityId: company.id, action: "CREATE" });
    return serialize(company);
  });
}

export async function updateCompany(id: string, data: CompanyInput) {
  const tenantId = await getTenantId();

  return withTenant(tenantId, async (tx) => {
    const existing = await tx.company.findFirst({ where: { id, tenantId } });
    if (!existing) throw domainError("NOT_FOUND", "Tiers introuvable");

    const company = await tx.company.update({
      where: { id },
      data: {
        name: data.name,
        type: data.type,
        ICE: data.ICE || null,
        IF: data.IF || null,
        RC: data.RC || null,
        city: data.city || null,
        address: data.address || null,
        ...(data.email !== undefined ? { email: data.email || null } : {}),
        ...(data.phone !== undefined ? { phone: data.phone || null } : {}),
      },
    });

    await audit(tx, { tenantId, entityType: "Company", entityId: id, action: "UPDATE" });
    return serialize(company);
  });
}
