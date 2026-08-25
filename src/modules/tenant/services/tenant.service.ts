"use server";

import { prisma } from "@/shared/db/prisma";
import { getTenantId } from "@/lib/auth";
import type { ModuleCode } from "@/shared/modules/module-config";
import { Role } from "@/generated/prisma/enums";

export interface TenantSettingsData {
  id: string;
  name: string;
  legalName: string | null;
  ICE: string | null;
  RC: string | null;
  IF: string | null;
  Patente: string | null;
  address: string | null;
  city: string | null;
  defaultCurrency: string;
  fiscalYearStart: Date | null;
  logo: string | null;
  enabledModules: Record<string, any> | null;
  subscriptionPlan: string | null;
  memberships: {
    id: string;
    role: Role;
    invitedAt: Date;
    acceptedAt: Date | null;
    user: {
      id: string;
      email: string;
      name: string | null;
      locale: string;
      status: string;
    };
  }[];
}

/**
 * Ensures the tenant exists and returns all settings, profile, and team members.
 */
export async function getTenantSettings(): Promise<TenantSettingsData> {
  const tenantId = await getTenantId();

  // Ensure default demo tenant exists
  let tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      memberships: {
        include: {
          user: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        id: tenantId,
        name: "Atlas Distribution SARL",
        legalName: "Atlas Distribution & Négoce SARL",
        ICE: "002345678000099",
        RC: "98765 Casablanca",
        IF: "54321098",
        Patente: "34120987",
        city: "Casablanca",
        address: "123 Boulevard d'Anfa, Quartier Gauthier, Casablanca",
        defaultCurrency: "MAD",
        fiscalYearStart: new Date(new Date().getFullYear(), 0, 1),
        enabledModules: {
          modules: ["CRM", "SD", "MM", "INV", "FI", "COMP", "DOC"],
          phone: "+212 5 22 45 67 89",
          email: "contact@atlasdistribution.ma",
          website: "https://atlasdistribution.ma",
          cnss: "7654321",
          bankName: "Attijariwafa Bank",
          bankRIB: "007 780 0001234567890123 45",
          defaultTva: 20,
          defaultPaymentTerms: 30,
          defaultDevisValidity: 15,
          invoiceFooterNote: "SARL au capital de 100.000 DH — RC Casablanca 98765 — IF 54321098 — ICE 002345678000099 — Patente 34120987",
          dgiWave: "Wave3",
        },
      },
      include: {
        memberships: {
          include: {
            user: true,
          },
        },
      },
    });
  }

  // Ensure at least one Owner membership exists for display
  if (tenant.memberships.length === 0) {
    const defaultUser = await prisma.user.upsert({
      where: { id: "demo-owner" },
      update: {},
      create: {
        id: "demo-owner",
        email: "owner@atlasdistribution.ma",
        name: "Aicha El Fassi",
        locale: "fr",
        status: "active",
      },
    });

    const membership = await prisma.tenantMembership.upsert({
      where: {
        userId_tenantId: {
          userId: defaultUser.id,
          tenantId: tenant.id,
        },
      },
      update: { role: Role.Owner },
      create: {
        userId: defaultUser.id,
        tenantId: tenant.id,
        role: Role.Owner,
      },
      include: {
        user: true,
      },
    });

    tenant.memberships = [membership];
  }

  return tenant as unknown as TenantSettingsData;
}

/**
 * Updates company profile and legal identifiers
 */
export async function updateTenantProfile(data: {
  name: string;
  legalName?: string;
  ICE?: string;
  RC?: string;
  IF?: string;
  Patente?: string;
  city?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  cnss?: string;
  bankName?: string;
  bankRIB?: string;
}) {
  const tenantId = await getTenantId();
  const existing = await prisma.tenant.findUnique({ where: { id: tenantId } });
  const existingModules = (existing?.enabledModules as Record<string, any>) || {};

  const updatedModules = {
    ...existingModules,
    phone: data.phone ?? existingModules.phone,
    email: data.email ?? existingModules.email,
    website: data.website ?? existingModules.website,
    cnss: data.cnss ?? existingModules.cnss,
    bankName: data.bankName ?? existingModules.bankName,
    bankRIB: data.bankRIB ?? existingModules.bankRIB,
  };

  return await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      name: data.name,
      legalName: data.legalName,
      ICE: data.ICE,
      RC: data.RC,
      IF: data.IF,
      Patente: data.Patente,
      city: data.city,
      address: data.address,
      enabledModules: updatedModules,
    },
  });
}

/**
 * Updates commercial & invoicing preferences
 */
export async function updateCommercialSettings(data: {
  defaultCurrency: string;
  defaultTva: number;
  defaultPaymentTerms: number;
  defaultDevisValidity: number;
  invoiceFooterNote: string;
  dgiWave: string;
}) {
  const tenantId = await getTenantId();
  const existing = await prisma.tenant.findUnique({ where: { id: tenantId } });
  const existingModules = (existing?.enabledModules as Record<string, any>) || {};

  const updatedModules = {
    ...existingModules,
    defaultTva: data.defaultTva,
    defaultPaymentTerms: data.defaultPaymentTerms,
    defaultDevisValidity: data.defaultDevisValidity,
    invoiceFooterNote: data.invoiceFooterNote,
    dgiWave: data.dgiWave,
  };

  return await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      defaultCurrency: data.defaultCurrency,
      enabledModules: updatedModules,
    },
  });
}

/**
 * Toggles enabled modules in tenant configuration
 */
export async function updateModuleToggles(modules: ModuleCode[]) {
  const tenantId = await getTenantId();
  const existing = await prisma.tenant.findUnique({ where: { id: tenantId } });
  const existingModules = (existing?.enabledModules as Record<string, any>) || {};

  const updatedModules = {
    ...existingModules,
    modules,
  };

  return await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      enabledModules: updatedModules,
    },
  });
}

/**
 * Invites a new team member
 */
export async function inviteTeamMember(data: {
  email: string;
  name: string;
  role: Role;
}) {
  const tenantId = await getTenantId();

  // Find or create user
  const user = await prisma.user.upsert({
    where: { email: data.email },
    update: { name: data.name },
    create: {
      id: crypto.randomUUID(),
      email: data.email,
      name: data.name,
      locale: "fr",
      status: "active",
    },
  });

  // Create membership
  return await prisma.tenantMembership.upsert({
    where: {
      userId_tenantId: {
        userId: user.id,
        tenantId,
      },
    },
    update: {
      role: data.role,
    },
    create: {
      userId: user.id,
      tenantId,
      role: data.role,
    },
    include: {
      user: true,
    },
  });
}

/**
 * Updates a member's role
 */
export async function updateMemberRole(membershipId: string, role: Role) {
  const tenantId = await getTenantId();
  return await prisma.tenantMembership.update({
    where: { id: membershipId, tenantId },
    data: { role },
    include: { user: true },
  });
}

/**
 * Removes a member from tenant
 */
export async function removeTeamMember(membershipId: string) {
  const tenantId = await getTenantId();
  return await prisma.tenantMembership.delete({
    where: { id: membershipId, tenantId },
  });
}

/**
 * Exports all tenant data for portability & CNDP / Loi 09-08 compliance
 */
export async function exportTenantData() {
  const tenantId = await getTenantId();

  const [
    tenant,
    companies,
    contacts,
    opportunities,
    products,
    devis,
    orders,
    invoices,
    stockLevels,
    stockMovements,
    accounts,
  ] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId } }),
    prisma.company.findMany({ where: { tenantId } }),
    prisma.contact.findMany({ where: { tenantId } }),
    prisma.opportunity.findMany({ where: { tenantId } }),
    prisma.product.findMany({ where: { tenantId } }),
    prisma.devis.findMany({ where: { tenantId }, include: { lines: true } }),
    prisma.salesOrder.findMany({ where: { tenantId } }),
    prisma.invoice.findMany({ where: { tenantId }, include: { payments: true } }),
    prisma.stockLevel.findMany({ where: { tenantId } }),
    prisma.stockMovement.findMany({ where: { tenantId } }),
    prisma.account.findMany({ where: { tenantId } }),
  ]);

  return {
    exportDate: new Date().toISOString(),
    tenantId,
    tenant,
    companies,
    contacts,
    opportunities,
    products,
    devis,
    orders,
    invoices,
    stockLevels,
    stockMovements,
    accounts,
  };
}
