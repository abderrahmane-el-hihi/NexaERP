"use server";

import { prisma } from "@/shared/db/prisma";
import { getTenantId } from "@/lib/auth";

export async function getOpportunities() {
  const tenantId = await getTenantId();
  return await prisma.opportunity.findMany({
    where: { tenantId },
    include: { company: true, contact: true, owner: true },
    orderBy: { expectedCloseDate: "asc" }
  });
}

export async function createOpportunity(
  data: { 
    title: string; 
    companyId: string; 
    ownerId: string; 
    estimatedValue?: number;
    stage?: string;
    expectedCloseDate?: Date;
  }
) {
  const tenantId = await getTenantId();
  await prisma.user.upsert({
    where: { id: data.ownerId },
    update: {},
    create: {
      id: data.ownerId,
      email: "owner@demo.ma",
      name: "Demo Owner",
      locale: "fr",
      status: "active",
    },
  });
  return await prisma.opportunity.create({
    data: {
      tenantId,
      ...data
    }
  });
}

export async function updateOpportunityStage(id: string, stage: string) {
  const tenantId = await getTenantId();
  return await prisma.opportunity.update({
    where: { id, tenantId },
    data: { stage }
  });
}
