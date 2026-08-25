"use server";

import { prisma } from "@/shared/db/prisma";
import { getTenantId } from "@/lib/auth";

const STANDARD_ACCOUNTS = [
  { code: "3421", name: "Clients", type: "Asset", description: "Comptes clients" },
  { code: "7111", name: "Ventes de marchandises", type: "Revenue", description: "Chiffre d'affaires" },
  { code: "4455", name: "Etat, TVA facturée", type: "Liability", description: "TVA collectée sur les ventes" },
  { code: "5141", name: "Banques", type: "Asset", description: "Comptes bancaires" },
  { code: "4411", name: "Fournisseurs", type: "Liability", description: "Dettes fournisseurs" },
  { code: "6111", name: "Achats de marchandises", type: "Expense", description: "Achats" },
  { code: "3455", name: "Etat, TVA récupérable", type: "Asset", description: "TVA déductible sur achats" },
];

export async function ensureStandardCOA(tenantId: string) {
  // Ensure tenant exists
  await prisma.tenant.upsert({
    where: { id: tenantId },
    update: {},
    create: {
      id: tenantId,
      name: "Demo Enterprise SARL",
      ICE: "001234567890001",
      RC: "123456",
      IF: "98765432",
      city: "Casablanca",
      address: "123 Boulevard d'Anfa, Casablanca",
    },
  });

  // Use a transaction to create missing accounts
  await prisma.$transaction(async (tx) => {
    for (const acc of STANDARD_ACCOUNTS) {
      const exists = await tx.account.findUnique({
        where: {
          tenantId_code: {
            tenantId,
            code: acc.code,
          },
        },
      });

      if (!exists) {
        await tx.account.create({
          data: {
            tenantId,
            code: acc.code,
            name: acc.name,
            type: acc.type,
            description: acc.description,
          },
        });
      }
    }
  });
}

export async function getAccounts() {
  const tenantId = await getTenantId();
  // Ensure COA exists before returning
  await ensureStandardCOA(tenantId);
  
  return await prisma.account.findMany({
    where: { tenantId },
    orderBy: { code: "asc" },
  });
}
