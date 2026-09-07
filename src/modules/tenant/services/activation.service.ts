"use server";

import { withTenant } from "@/shared/db/prisma";

export interface ActivationMilestone {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  href: string;
  actionText: string;
}

export interface ActivationStatus {
  tenantId: string;
  isDemo: boolean;
  dataMode: "clean" | "import" | "demo";
  dataImportSkipped: boolean;
  completedCount: number;
  totalCount: number;
  percentage: number;
  isComplete: boolean;
  milestones: ActivationMilestone[];
}

/**
 * Derives the tenant activation checklist strictly from actual database rows.
 * Prevents phantom progress or unbacked compliance claims.
 */
export async function getActivationStatus(tenantId: string): Promise<ActivationStatus> {
  return withTenant(tenantId, async (tx) => {
    // 1. Fetch tenant metadata
    const tenant = await tx.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        ICE: true,
        IF: true,
        RC: true,
        city: true,
        address: true,
        enabledModules: true,
      },
    });

    if (!tenant) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    const modulesData = (tenant.enabledModules as Record<string, unknown>) || {};
    const dataMode = (modulesData.dataMode as "clean" | "import" | "demo") || "clean";
    const dataImportSkipped = Boolean(modulesData.dataImportSkipped);
    const isDemo = dataMode === "demo";

    // 2. Count live records across domain entities
    const [importJobsCount, customerCount, productCount, invoiceCount, devisCount, paymentCount] =
      await Promise.all([
        tx.importJob.count({ where: { tenantId, status: "Completed" } }),
        tx.company.count({ where: { tenantId, type: { in: ["customer", "both"] } } }),
        tx.product.count({ where: { tenantId, isActive: true } }),
        tx.invoice.count({ where: { tenantId } }),
        tx.devis.count({ where: { tenantId } }),
        tx.payment.count({ where: { tenantId } }),
      ]);

    // 3. Evaluate each milestone
    const companyConfigured = Boolean(tenant.name && (tenant.ICE || tenant.city));
    const dataImportedOrSkipped = importJobsCount > 0 || dataImportSkipped || isDemo;
    const hasCustomer = customerCount > 0;
    const hasProduct = productCount > 0;
    const hasDraftDocument = invoiceCount + devisCount > 0;
    const hasPaymentRecorded = paymentCount > 0;

    const milestones: ActivationMilestone[] = [
      {
        id: "company_info",
        title: "Identité de l'entreprise",
        description: "Raison sociale, identifiants légaux marocains (ICE, IF) et adresse.",
        completed: companyConfigured,
        href: "/dashboard/settings",
        actionText: companyConfigured ? "Consulter" : "Compléter",
      },
      {
        id: "data_import",
        title: "Import des données initiales",
        description: "Importez vos tiers, catalogue ou balances d'ouverture, ou démarrez directement.",
        completed: dataImportedOrSkipped,
        href: "/dashboard/settings",
        actionText: dataImportedOrSkipped ? "Gérer" : "Importer ou passer",
      },
      {
        id: "first_customer",
        title: "Premier client enregistré",
        description: "Fiche partenaire client avec ICE, contact et conditions de paiement.",
        completed: hasCustomer,
        href: "/dashboard/crm/companies",
        actionText: hasCustomer ? "Voir les clients" : "Créer un client",
      },
      {
        id: "first_product",
        title: "Catalogue d'articles ou services",
        description: "Prestations ou produits marchands avec taux de TVA marocain applicable.",
        completed: hasProduct,
        href: "/dashboard/catalog",
        actionText: hasProduct ? "Voir le catalogue" : "Ajouter un produit",
      },
      {
        id: "first_document",
        title: "Premier devis ou facture brouillon",
        description: "Édition d'une première pièce commerciale conforme aux règles marocaines.",
        completed: hasDraftDocument,
        href: "/dashboard/sales/invoices",
        actionText: hasDraftDocument ? "Consulter les ventes" : "Créer un devis / facture",
      },
      {
        id: "first_payment",
        title: "Premier règlement ou encaissement",
        description: "Saisie d'un paiement bancaire, chèque ou effet avec lettrage comptable.",
        completed: hasPaymentRecorded,
        href: "/dashboard/sales/payments",
        actionText: hasPaymentRecorded ? "Voir les encaissements" : "Saisir un paiement",
      },
    ];

    const completedCount = milestones.filter((m) => m.completed).length;
    const totalCount = milestones.length;
    const percentage = Math.round((completedCount / totalCount) * 100);

    return {
      tenantId,
      isDemo,
      dataMode,
      dataImportSkipped,
      completedCount,
      totalCount,
      percentage,
      isComplete: completedCount === totalCount,
      milestones,
    };
  });
}

/**
 * Allows the user to deliberately mark the data import milestone as skipped.
 */
export async function skipDataImport(tenantId: string) {
  return withTenant(tenantId, async (tx) => {
    const tenant = await tx.tenant.findUnique({
      where: { id: tenantId },
      select: { enabledModules: true },
    });

    if (!tenant) throw new Error("Tenant introuvable");

    const currentModules = (tenant.enabledModules as Record<string, unknown>) || {};
    await tx.tenant.update({
      where: { id: tenantId },
      data: {
        enabledModules: {
          ...currentModules,
          dataImportSkipped: true,
        },
      },
    });

    return { success: true };
  });
}
