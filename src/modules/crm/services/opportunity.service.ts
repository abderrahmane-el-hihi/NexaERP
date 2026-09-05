"use server";

import { Prisma } from "@/generated/prisma/client";
import { withTenant } from "@/shared/db/prisma";
import { getCurrentUser, getTenantId } from "@/lib/auth";
import { dec, serialize } from "@/shared/money";
import { domainError } from "@/shared/errors";

const STAGES = ["New", "Qualified", "DevisSent", "Won", "Lost"];

export async function getOpportunities() {
  const tenantId = await getTenantId();
  const rows = await withTenant(tenantId, (tx) =>
    tx.opportunity.findMany({
      where: { tenantId },
      include: { company: true, contact: true, owner: true },
      orderBy: { expectedCloseDate: "asc" },
      take: 500,
    })
  );
  return serialize(rows);
}

export async function createOpportunity(data: {
  title: string;
  companyId: string;
  ownerId?: string;
  estimatedValue?: number | string;
  stage?: string;
  expectedCloseDate?: Date;
}) {
  const tenantId = await getTenantId();
  const user = await getCurrentUser();

  // The owner must be a real, signed-in user. The previous version silently created a
  // fake "Demo Owner" account whenever the id did not exist.
  const ownerId = data.ownerId ?? user?.id;
  if (!ownerId) throw domainError("FORBIDDEN", "Utilisateur non authentifié");

  if (data.stage && !STAGES.includes(data.stage)) {
    throw domainError("VALIDATION_FAILED", `Étape inconnue: ${data.stage}`);
  }

  return withTenant(tenantId, async (tx) => {
    const membership = await tx.tenantMembership.findFirst({ where: { tenantId, userId: ownerId } });
    if (!membership) throw domainError("FORBIDDEN", "Le responsable n'appartient pas à cet espace");

    const company = await tx.company.findFirst({ where: { id: data.companyId, tenantId } });
    if (!company) throw domainError("NOT_FOUND", "Société introuvable");

    const opportunity = await tx.opportunity.create({
      data: {
        tenantId,
        title: data.title,
        companyId: data.companyId,
        ownerId,
        stage: data.stage ?? "New",
        estimatedValue: new Prisma.Decimal(dec(data.estimatedValue ?? 0).toFixed(6)),
        expectedCloseDate: data.expectedCloseDate ?? null,
      },
    });
    return serialize(opportunity);
  });
}

export async function updateOpportunityStage(id: string, stage: string) {
  const tenantId = await getTenantId();
  if (!STAGES.includes(stage)) {
    throw domainError("VALIDATION_FAILED", `Étape inconnue: ${stage}`);
  }
  return withTenant(tenantId, async (tx) => {
    const existing = await tx.opportunity.findFirst({ where: { id, tenantId } });
    if (!existing) throw domainError("NOT_FOUND", "Opportunité introuvable");
    const updated = await tx.opportunity.update({ where: { id }, data: { stage } });
    return serialize(updated);
  });
}
