import type { Tx } from "@/shared/db/prisma";

/**
 * Moroccan chart of accounts (CGNC) seed, journals, taxes and the accounting calendar.
 *
 * This runs once per tenant at provisioning. It never creates a Tenant: a seeding
 * helper that can invent a company is how phantom tenants appear in production.
 */

export interface SeedAccount {
  code: string;
  name: string;
  type: "Asset" | "Liability" | "Equity" | "Revenue" | "Expense";
  isReconcilable?: boolean;
}

export const MOROCCAN_COA: SeedAccount[] = [
  // Classe 1 — Financement permanent
  { code: "1111", name: "Capital social", type: "Equity" },
  { code: "1140", name: "Réserve légale", type: "Equity" },
  { code: "1191", name: "Résultat net de l'exercice", type: "Equity" },
  { code: "1481", name: "Emprunts auprès des établissements de crédit", type: "Liability" },

  // Classe 2 — Actif immobilisé
  { code: "2321", name: "Bâtiments", type: "Asset" },
  { code: "2332", name: "Matériel et outillage", type: "Asset" },
  { code: "2340", name: "Matériel de transport", type: "Asset" },
  { code: "2355", name: "Mobilier, matériel de bureau et aménagements", type: "Asset" },
  { code: "2356", name: "Matériel informatique", type: "Asset" },
  { code: "2832", name: "Amortissements du matériel et outillage", type: "Asset" },
  { code: "2834", name: "Amortissements du matériel de transport", type: "Asset" },

  // Classe 3 — Actif circulant
  { code: "3111", name: "Marchandises", type: "Asset" },
  { code: "3121", name: "Matières premières", type: "Asset" },
  { code: "3151", name: "Produits finis", type: "Asset" },
  { code: "3411", name: "Fournisseurs débiteurs, avances et acomptes", type: "Asset" },
  { code: "3421", name: "Clients", type: "Asset", isReconcilable: true },
  { code: "3424", name: "Clients douteux ou litigieux", type: "Asset", isReconcilable: true },
  { code: "3455", name: "État — TVA récupérable", type: "Asset" },
  { code: "3458", name: "État — autres comptes débiteurs", type: "Asset" },

  // Classe 4 — Passif circulant
  { code: "4411", name: "Fournisseurs", type: "Liability", isReconcilable: true },
  { code: "4417", name: "Fournisseurs — factures non parvenues", type: "Liability" },
  { code: "4421", name: "Clients — avances et acomptes", type: "Liability" },
  { code: "4432", name: "Rémunérations dues au personnel", type: "Liability" },
  { code: "4441", name: "CNSS et organismes sociaux", type: "Liability" },
  { code: "4452", name: "État — impôts, taxes et assimilés", type: "Liability" },
  { code: "4455", name: "État — TVA facturée", type: "Liability" },
  { code: "4456", name: "État — TVA due", type: "Liability" },

  // Classe 5 — Trésorerie
  { code: "5141", name: "Banques (soldes débiteurs)", type: "Asset", isReconcilable: true },
  { code: "5111", name: "Chèques à encaisser ou à l'encaissement", type: "Asset", isReconcilable: true },
  { code: "5161", name: "Caisses", type: "Asset", isReconcilable: true },

  // Classe 6 — Charges
  { code: "6111", name: "Achats de marchandises", type: "Expense" },
  { code: "6114", name: "Variation des stocks de marchandises", type: "Expense" },
  { code: "6121", name: "Achats de matières premières", type: "Expense" },
  { code: "6131", name: "Locations et charges locatives", type: "Expense" },
  { code: "6133", name: "Entretien et réparations", type: "Expense" },
  { code: "6142", name: "Transports", type: "Expense" },
  { code: "6145", name: "Frais postaux et de télécommunications", type: "Expense" },
  { code: "6147", name: "Services bancaires", type: "Expense" },
  { code: "6167", name: "Impôts et taxes directs", type: "Expense" },
  { code: "6171", name: "Rémunérations du personnel", type: "Expense" },
  { code: "6174", name: "Charges sociales", type: "Expense" },
  { code: "6182", name: "Pertes sur créances irrécouvrables", type: "Expense" },
  { code: "6193", name: "Dotations aux amortissements", type: "Expense" },
  { code: "6586", name: "Pertes et écarts sur inventaire", type: "Expense" },

  // Classe 7 — Produits
  { code: "7111", name: "Ventes de marchandises", type: "Revenue" },
  { code: "7121", name: "Ventes de biens produits", type: "Revenue" },
  { code: "7124", name: "Ventes de services produits", type: "Revenue" },
  { code: "7127", name: "Ventes de produits accessoires", type: "Revenue" },
  { code: "7386", name: "Gains et écarts sur inventaire", type: "Revenue" },
];

export const DEFAULT_JOURNALS = [
  { code: "VTE", name: "Journal des ventes", type: "SALE" },
  { code: "ACH", name: "Journal des achats", type: "PURCHASE" },
  { code: "BQ", name: "Journal de banque", type: "BANK" },
  { code: "CAI", name: "Journal de caisse", type: "CASH" },
  { code: "OD", name: "Opérations diverses", type: "MISC" },
  { code: "STK", name: "Journal des stocks", type: "INVENTORY" },
];

/**
 * Moroccan VAT rates. Seeded as dated rows, never hardcoded in application logic:
 * the rate grid has been under multi-year reform and a change must be a data change,
 * with old documents keeping the rate that applied when they were posted.
 */
export const DEFAULT_TAXES = [
  { name: "TVA 20%", rate: "0.20", scope: "BOTH" },
  { name: "TVA 14%", rate: "0.14", scope: "BOTH" },
  { name: "TVA 10%", rate: "0.10", scope: "BOTH" },
  { name: "TVA 7%", rate: "0.07", scope: "BOTH" },
  { name: "Exonéré / 0%", rate: "0", scope: "BOTH" },
];

/** Idempotent: safe to call again after adding accounts to the seed list. */
export async function ensureStandardCOA(tx: Tx, tenantId: string): Promise<void> {
  const existing = await tx.account.findMany({
    where: { tenantId },
    select: { code: true },
  });
  const have = new Set(existing.map((a) => a.code));
  const missing = MOROCCAN_COA.filter((a) => !have.has(a.code));

  if (missing.length > 0) {
    await tx.account.createMany({
      data: missing.map((a) => ({
        tenantId,
        code: a.code,
        name: a.name,
        type: a.type,
        isReconcilable: a.isReconcilable ?? false,
      })),
    });
  }
}

export async function ensureJournals(tx: Tx, tenantId: string): Promise<void> {
  const existing = await tx.journal.findMany({ where: { tenantId }, select: { code: true } });
  const have = new Set(existing.map((j) => j.code));
  const missing = DEFAULT_JOURNALS.filter((j) => !have.has(j.code));
  if (missing.length > 0) {
    await tx.journal.createMany({
      data: missing.map((j) => ({ tenantId, code: j.code, name: j.name, type: j.type })),
    });
  }
}

export async function ensureTaxes(tx: Tx, tenantId: string): Promise<void> {
  const count = await tx.tax.count({ where: { tenantId } });
  if (count > 0) return;
  await tx.tax.createMany({
    data: DEFAULT_TAXES.map((t) => ({
      tenantId,
      name: t.name,
      rate: t.rate,
      scope: t.scope,
    })),
  });
}

/** Creates the twelve monthly periods of a fiscal year if they do not exist. */
export async function ensurePeriods(tx: Tx, tenantId: string, year: number): Promise<void> {
  const existing = await tx.accountingPeriod.findMany({
    where: { tenantId, name: { startsWith: `${year}-` } },
    select: { name: true },
  });
  const have = new Set(existing.map((p) => p.name));

  const rows = [];
  for (let month = 0; month < 12; month++) {
    const name = `${year}-${String(month + 1).padStart(2, "0")}`;
    if (have.has(name)) continue;
    rows.push({
      tenantId,
      name,
      startDate: new Date(Date.UTC(year, month, 1)),
      endDate: new Date(Date.UTC(year, month + 1, 0, 23, 59, 59)),
      status: "Open",
    });
  }
  if (rows.length > 0) await tx.accountingPeriod.createMany({ data: rows });
}

/** Everything a new tenant needs to be able to post on day one. */
export async function seedAccountingFoundation(
  tx: Tx,
  tenantId: string,
  year: number = new Date().getFullYear()
): Promise<void> {
  await ensureStandardCOA(tx, tenantId);
  await ensureJournals(tx, tenantId);
  await ensureTaxes(tx, tenantId);
  await ensurePeriods(tx, tenantId, year);
}
