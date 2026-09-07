"use server";

import { withTenant, withPlatformBypass, type Tx } from "@/shared/db/prisma";
import { seedAccountingFoundation } from "@/modules/finance/services/coa.service";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { Prisma } from "@/generated/prisma/client";

const ACTIVE_TENANT_COOKIE = "nexa_active_tenant";

export interface CreateEnterpriseInput {
  name: string;
  ICE?: string;
  IF?: string;
  RC?: string;
  city?: string;
  address?: string;
  enabledModules?: string[];
  dataMode?: "clean" | "import" | "demo";
}

export interface CreateEnterpriseOptions {
  userId?: string;
}

/**
 * Seeds canonical Moroccan demo records for evaluation without polluting accounting foundation.
 */
export async function seedDemoData(tx: Tx, tenantId: string, userId: string): Promise<void> {
  // 1. Create a sample Moroccan customer
  const demoCompany = await tx.company.create({
    data: {
      tenantId,
      name: "Société Atlas Distribution SARL (Exemple)",
      ICE: "001234567890001",
      IF: "12345678",
      RC: "98765",
      type: "customer",
      city: "Casablanca",
      address: "Boulevard Zerktouni, Casablanca",
      tags: ["demo"],
      notes: "Client de démonstration NexaERP (peut être purgé à tout moment).",
    },
  });

  // 2. Create a sample service product with Moroccan 20% VAT
  const demoProduct = await tx.product.create({
    data: {
      tenantId,
      reference: "DEMO-SRV-01",
      name: "Pack Conseil & Digitalisation (Exemple)",
      description: "Prestation d'accompagnement et transformation numérique PME",
      type: "service",
      unit: "prestation",
      salesPrice: new Prisma.Decimal("15000.00"),
      purchasePrice: new Prisma.Decimal("0.00"),
      tvaRate: new Prisma.Decimal("20.00"),
      category: "DEMO",
      isActive: true,
    },
  });

  // 3. Create a sample draft commercial quote (Devis)
  await tx.devis.create({
    data: {
      tenantId,
      number: "DEV-DEMO-0001",
      companyId: demoCompany.id,
      status: "Draft",
      subtotal: new Prisma.Decimal("15000.00"),
      tvaAmount: new Prisma.Decimal("3000.00"),
      total: new Prisma.Decimal("18000.00"),
      notes: "Exemple de devis commercial initial pour tester le cycle de vente. [DEMO]",
      lines: {
        create: [
          {
            tenantId,
            productId: demoProduct.id,
            description: "Pack Conseil & Digitalisation (Exemple)",
            quantity: new Prisma.Decimal("1.00"),
            unitPrice: new Prisma.Decimal("15000.00"),
            tvaRate: new Prisma.Decimal("20.00"),
            discountPercent: new Prisma.Decimal("0.00"),
            lineSubtotal: new Prisma.Decimal("15000.00"),
            lineTva: new Prisma.Decimal("3000.00"),
            lineTotal: new Prisma.Decimal("18000.00"),
            position: 1,
          },
        ],
      },
    },
  });

  // 4. Record audit trail
  await tx.auditLog.create({
    data: {
      tenantId,
      userId,
      entityType: "Tenant",
      entityId: tenantId,
      action: "DEMO_DATA_SEEDED",
      diff: { message: "Données de démonstration initialisées" },
    },
  });
}

/**
 * Safely removes demo data without altering the Moroccan chart of accounts or user records.
 */
export async function purgeDemoData(tenantId: string, explicitUserId?: string) {
  let actingUserId = explicitUserId;
  if (!actingUserId) {
    try {
      const user = await getCurrentUser();
      actingUserId = user?.id;
    } catch {
      // outside request context
    }
  }
  if (!actingUserId) {
    actingUserId = "operator-system";
  }

  return withTenant(tenantId, async (tx) => {
    // 1. Delete demo devis lines and devis
    const demoDevis = await tx.devis.findMany({
      where: {
        tenantId,
        OR: [
          { number: { startsWith: "DEV-DEMO" } },
          { notes: { contains: "[DEMO]" } },
        ],
      },
      select: { id: true },
    });
    const demoDevisIds = demoDevis.map((d) => d.id);
    if (demoDevisIds.length > 0) {
      await tx.devisLine.deleteMany({
        where: { tenantId, devisId: { in: demoDevisIds } },
      });
      await tx.devis.deleteMany({
        where: { tenantId, id: { in: demoDevisIds } },
      });
    }

    // 2. Delete demo products
    await tx.product.deleteMany({
      where: {
        tenantId,
        OR: [
          { category: "DEMO" },
          { reference: { startsWith: "DEMO-" } },
        ],
      },
    });

    // 3. Delete demo companies
    await tx.company.deleteMany({
      where: {
        tenantId,
        tags: { has: "demo" },
      },
    });

    // 4. Update tenant dataMode to "clean"
    const tenant = await tx.tenant.findUnique({
      where: { id: tenantId },
      select: { enabledModules: true },
    });
    const currentModules = (tenant?.enabledModules as Record<string, unknown>) || {};
    await tx.tenant.update({
      where: { id: tenantId },
      data: {
        enabledModules: {
          ...currentModules,
          dataMode: "clean",
        },
      },
    });

    // 5. Audit log
    await tx.auditLog.create({
      data: {
        tenantId,
        userId: actingUserId!,
        entityType: "Tenant",
        entityId: tenantId,
        action: "DEMO_DATA_PURGED",
        diff: { message: "Données de démonstration purgées avec succès." },
      },
    });

    return {
      success: true,
      purgedCount: {
        devis: demoDevisIds.length,
      },
    };
  });
}

/**
 * Creates or retrieves the user's primary tenant idempotently.
 */
export async function createNewEnterprise(
  input: CreateEnterpriseInput,
  options?: CreateEnterpriseOptions
) {
  let userId = options?.userId;
  if (!userId) {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Unauthorized");
    }
    userId = user.id;
  }

  const cleanName = input.name.trim();
  if (!cleanName) throw new Error("Le nom de l'entreprise est obligatoire.");

  // Check if user already owns an active tenant
  const existingMembership = await withPlatformBypass(async (tx) => {
    return tx.tenantMembership.findFirst({
      where: {
        userId,
        role: "Owner",
      },
      include: {
        tenant: true,
      },
    });
  });

  if (existingMembership?.tenant) {
    try {
      const cookieStore = await cookies();
      cookieStore.set(ACTIVE_TENANT_COOKIE, existingMembership.tenant.id, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
    } catch {
      // outside request context
    }

    return {
      success: true,
      tenantId: existingMembership.tenant.id,
      name: existingMembership.tenant.name,
      alreadyExisted: true,
    };
  }

  // Generate safe tenant ID
  const slugBase = cleanName.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
  const tenantId = `tenant-${slugBase}-${Date.now().toString().slice(-6)}`;

  const dataMode = input.dataMode || "clean";
  const modules =
    input.enabledModules && input.enabledModules.length > 0
      ? input.enabledModules
      : ["CRM", "SD", "MM", "INV", "FI", "COMP", "DOC"];

  const enabledModulesData = {
    modules,
    tvaWave: 1,
    defaultPaymentTerms: "Net 30 Days",
    defaultTvaRate: 20,
    currency: "MAD",
    dataMode,
    dataImportSkipped: false,
  };

  // Run in a transaction to ensure everything is created together
  const tenant = await withTenant(tenantId, async (tx) => {
    // 1. Create Tenant Record
    const t = await tx.tenant.create({
      data: {
        id: tenantId,
        name: cleanName,
        ICE: input.ICE?.trim() || null,
        IF: input.IF?.trim() || null,
        RC: input.RC?.trim() || null,
        city: input.city?.trim() || "Casablanca",
        address: input.address?.trim() || "Boulevard Zerktouni, Casablanca",
        subscriptionPlan: "Business",
        enabledModules: enabledModulesData,
      },
    });

    // 2. Link User to Tenant as Owner
    await tx.tenantMembership.create({
      data: {
        tenantId: t.id,
        userId: userId!,
        role: "Owner",
      },
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

    // 4. Provision standard Moroccan COA, journals, taxes, calendar
    await seedAccountingFoundation(tx, tenantId);

    // 5. If requested, seed demo data
    if (dataMode === "demo") {
      await seedDemoData(tx, tenantId, userId!);
    }

    // 6. Record audit log
    await tx.auditLog.create({
      data: {
        tenantId,
        userId: userId!,
        entityType: "Tenant",
        entityId: tenantId,
        action: "TENANT_CREATED",
        diff: { name: cleanName, dataMode, city: input.city || "Casablanca" },
      },
    });

    return t;
  });

  // Set Active Tenant Cookie
  try {
    const cookieStore = await cookies();
    cookieStore.set(ACTIVE_TENANT_COOKIE, tenantId, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
  } catch {
    // outside request context
  }

  return {
    success: true,
    tenantId: tenant.id,
    name: tenant.name,
    alreadyExisted: false,
  };
}

