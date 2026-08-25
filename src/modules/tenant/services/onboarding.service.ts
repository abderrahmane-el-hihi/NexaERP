"use server";

import { prisma } from "@/shared/db/prisma";
import { ensureStandardCOA } from "@/modules/finance/services/coa.service";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth";

const ACTIVE_TENANT_COOKIE = "nexa_active_tenant";

export interface CreateEnterpriseInput {
  name: string;
  ICE?: string;
  IF?: string;
  RC?: string;
  city?: string;
  address?: string;
  enabledModules?: string[];
}

export async function createNewEnterprise(input: CreateEnterpriseInput) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const cleanName = input.name.trim();
  if (!cleanName) throw new Error("Company name is required.");

  // Generate safe tenant ID
  const slugBase = cleanName.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
  const tenantId = `tenant-${slugBase}-${Date.now().toString().slice(-6)}`;

  const modules = input.enabledModules && input.enabledModules.length > 0
    ? input.enabledModules
    : ["CRM", "SD", "MM", "INV", "FI", "COMP", "DOC"];

  // Run in a transaction to ensure everything is created together
  const tenant = await prisma.$transaction(async (tx) => {
    // 1. Create Tenant Record
    const t = await tx.tenant.create({
      data: {
        id: tenantId,
        name: cleanName,
        ICE: input.ICE?.trim() || null,
        IF: input.IF?.trim() || null,
        RC: input.RC?.trim() || null,
        city: input.city?.trim() || "Casablanca",
        address: input.address?.trim() || "Boulevard d'Anfa, Casablanca",
        subscriptionPlan: "Business",
        enabledModules: {
          modules,
          tvaWave: 1,
          defaultPaymentTerms: "Net 30 Days",
          defaultTvaRate: 20,
          currency: "MAD",
        },
      },
    });

    // 2. Link User to Tenant
    await tx.tenantMembership.create({
      data: {
        tenantId: t.id,
        userId: user.id,
        role: "Owner",
      }
    });

    // 3. Create Default Warehouse
    await tx.warehouse.create({
      data: {
        tenantId: t.id,
        name: `Entrepôt Principal (${cleanName})`,
        address: input.city ? `${input.city}, Maroc` : "Casablanca, Maroc",
        isDefault: true,
      },
    });
    
    return t;
  });

  // 4. Provision Moroccan Chart of Accounts (COA Classes 1-7)
  await ensureStandardCOA(tenantId);

  // 5. Set Active Tenant Cookie
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_TENANT_COOKIE, tenantId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return {
    success: true,
    tenantId: tenant.id,
    name: tenant.name,
  };
}
