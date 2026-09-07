import { describe, it, expect } from "vitest";
import { withTenant } from "@/shared/db/prisma";
import { dec, sum } from "@/shared/money";
import { previewImport, commitImport } from "@/modules/importer/services/csv-importer.service";
import { createTestTenant } from "./helpers/factory";

describe("Two-Phase Importer Workflow", () => {
  it("Preview phase never creates business records", async () => {
    const t = await createTestTenant();

    const companiesCsv = `Nom,Type,ICE,Ville
Alpha Distribution,Client,001234567890001,Casablanca
Beta Fournitures,Fournisseur,009876543210002,Rabat`;

    const preview = await previewImport("Company", companiesCsv, {
      tenantId: t.tenantId,
      userId: t.userId,
    });

    expect(preview.isValid).toBe(true);
    expect(preview.validCount).toBe(2);
    expect(preview.errorCount).toBe(0);

    // Verify zero records were written to the Company table
    const companiesInDb = await withTenant(t.tenantId, (tx) =>
      tx.company.findMany({ where: { tenantId: t.tenantId, name: { in: ["Alpha Distribution", "Beta Fournitures"] } } })
    );
    expect(companiesInDb).toHaveLength(0);

    // Verify only the staged ImportJob exists
    const jobInDb = await withTenant(t.tenantId, (tx) =>
      tx.importJob.findUnique({ where: { id: preview.jobId } })
    );
    expect(jobInDb).not.toBeNull();
    expect(jobInDb?.status).toBe("Validated");
    expect(jobInDb?.userId).toBe(t.userId);
  });

  it("Rejects invalid ICE format and reports row-numbered error", async () => {
    const t = await createTestTenant();

    const csvWithBadIce = `Nom,Type,ICE
Valide SARL,Client,001234567890001
Invalide SARL,Client,12345`; // 5 digits instead of 15

    const preview = await previewImport("Company", csvWithBadIce, {
      tenantId: t.tenantId,
      userId: t.userId,
    });

    expect(preview.isValid).toBe(false);
    expect(preview.errorCount).toBeGreaterThan(0);
    const iceError = preview.errors.find((e) => e.row === 3 && e.field === "ICE");
    expect(iceError).toBeDefined();
    expect(iceError?.message).toContain("15 chiffres");
  });

  it("Detects duplicate product references in CSV and existing DB catalogue", async () => {
    const t = await createTestTenant();

    // 1. In-file duplicate
    const csvWithInFileDup = `Nom,Reference,Type,PrixVente,PrixAchat,TVA
Produit A,REF-100,Bien,100,50,20
Produit B,REF-100,Bien,200,80,20`;

    const preview1 = await previewImport("Product", csvWithInFileDup, {
      tenantId: t.tenantId,
      userId: t.userId,
    });
    expect(preview1.isValid).toBe(false);
    const dupRefError = preview1.errors.find((e) => e.field === "reference");
    expect(dupRefError?.message).toContain("apparaît plusieurs fois");

    // 2. Existing product in DB
    const existingRef = "REF-EXISTING-99";
    await withTenant(t.tenantId, (tx) =>
      tx.product.create({
        data: {
          tenantId: t.tenantId,
          name: "Existing Product",
          reference: existingRef,
          type: "good",
        },
      })
    );

    const csvWithDbDup = `Nom,Reference,Type,PrixVente,PrixAchat,TVA
Nouveau Produit,${existingRef},Bien,150,75,20`;

    const preview2 = await previewImport("Product", csvWithDbDup, {
      tenantId: t.tenantId,
      userId: t.userId,
    });
    expect(preview2.isValid).toBe(false);
    expect(preview2.errors[0]?.message).toContain("existe déjà dans votre catalogue");
  });

  it("Rejects unbalanced opening balance with exact Decimal error and rejects missing accounts", async () => {
    const t = await createTestTenant();

    // 1. Unbalanced trial balance
    const unbalancedCsv = `CodeCompte,Debit,Credit,Libelle
1111,0.00,1000.00,Capital
5141,999.99,0.00,Banque`; // Missing 0.01

    const previewUnbalanced = await previewImport("OpeningBalance", unbalancedCsv, {
      tenantId: t.tenantId,
      userId: t.userId,
    });
    expect(previewUnbalanced.isValid).toBe(false);
    expect(previewUnbalanced.financialSummary?.isBalanced).toBe(false);
    const balanceError = previewUnbalanced.errors.find((e) => e.message.includes("Écart de balance"));
    expect(balanceError).toBeDefined();

    // 2. Missing account code in tenant COA
    const missingAccountCsv = `CodeCompte,Debit,Credit,Libelle
1111,0.00,5000.00,Capital
99999,5000.00,0.00,Compte Fictif`; // 99999 does not exist

    const previewMissing = await previewImport("OpeningBalance", missingAccountCsv, {
      tenantId: t.tenantId,
      userId: t.userId,
    });
    expect(previewMissing.isValid).toBe(false);
    const accountError = previewMissing.errors.find((e) => e.message.includes("Comptes non répertoriés"));
    expect(accountError).toBeDefined();
    expect(accountError?.message).toContain("99999");
  });

  it("Commit creates companies with real user audit log", async () => {
    const t = await createTestTenant();

    const csv = `Nom,Type,ICE,Email,Phone,ContactPrenom,ContactNom
Atlas Logistics SARL,Fournisseur,002233445566778,contact@atlaslog.ma,+212522001122,Omar,Alami`;

    const preview = await previewImport("Company", csv, {
      tenantId: t.tenantId,
      userId: t.userId,
    });
    expect(preview.isValid).toBe(true);

    const result = await commitImport(
      {
        jobId: preview.jobId,
        commitToken: preview.commitToken,
        contentHash: preview.contentHash,
      },
      { tenantId: t.tenantId, userId: t.userId }
    );

    expect(result.success).toBe(true);
    expect(result.importedCount).toBe(1);

    // Check Company in DB
    const company = await withTenant(t.tenantId, (tx) =>
      tx.company.findFirst({
        where: { tenantId: t.tenantId, ICE: "002233445566778" },
        include: { contacts: true },
      })
    );
    expect(company).not.toBeNull();
    expect(company?.name).toBe("Atlas Logistics SARL");
    expect(company?.type).toBe("Supplier");
    expect(company?.contacts).toHaveLength(1);
    expect(company?.contacts[0]?.firstName).toBe("Omar");

    // Check AuditLog has real user ID
    const auditLog = await withTenant(t.tenantId, (tx) =>
      tx.auditLog.findFirst({
        where: { tenantId: t.tenantId, entityId: company?.id },
      })
    );
    expect(auditLog?.userId).toBe(t.userId);
  });

  it("Commit creates products and canonical stock movement when initial stock is present", async () => {
    const t = await createTestTenant();

    const productCsv = `Nom,Reference,Type,PrixVente,PrixAchat,TVA,StockInitial
Huile Argan 1L,ARG-1L,Bien,250.00,160.00,20,30`;

    const preview = await previewImport("Product", productCsv, {
      tenantId: t.tenantId,
      userId: t.userId,
    });
    expect(preview.isValid).toBe(true);

    const commitRes = await commitImport(
      {
        jobId: preview.jobId,
        commitToken: preview.commitToken,
        contentHash: preview.contentHash,
      },
      { tenantId: t.tenantId, userId: t.userId }
    );
    expect(commitRes.success).toBe(true);

    const product = await withTenant(t.tenantId, (tx) =>
      tx.product.findUnique({
        where: { tenantId_reference: { tenantId: t.tenantId, reference: "ARG-1L" } },
        include: { stockLevels: true, stockMovements: true },
      })
    );

    expect(product).not.toBeNull();
    expect(dec(product!.salesPrice).equals(dec(250))).toBe(true);
    expect(dec(product!.purchasePrice).equals(dec(160))).toBe(true);

    // Verify stock movement was created via canonical service
    expect(product!.stockMovements.length).toBeGreaterThan(0);
    expect(dec(product!.stockMovements[0].quantity).equals(dec(30))).toBe(true);
    expect(product!.stockMovements[0].sourceDocumentType).toBe("ImportJob");

    // Verify derived stockLevel is 30
    expect(product!.stockLevels.length).toBeGreaterThan(0);
    expect(dec(product!.stockLevels[0].quantity).equals(dec(30))).toBe(true);
  });

  it("Opening balance posts a balanced entry through canonical engine", async () => {
    const t = await createTestTenant();

    const balanceCsv = `CodeCompte,Debit,Credit,Libelle
1111,0.00,80000.00,Capital social
2340,50000.00,0.00,Matériel de transport
5141,30000.00,0.00,Banque`;

    const preview = await previewImport("OpeningBalance", balanceCsv, {
      tenantId: t.tenantId,
      userId: t.userId,
    });
    expect(preview.isValid).toBe(true);

    const result = await commitImport(
      {
        jobId: preview.jobId,
        commitToken: preview.commitToken,
        contentHash: preview.contentHash,
      },
      { tenantId: t.tenantId, userId: t.userId }
    );
    expect(result.success).toBe(true);

    // Verify journal entry in DB
    const entry = await withTenant(t.tenantId, (tx) =>
      tx.journalEntry.findFirst({
        where: { tenantId: t.tenantId, sourceType: "OpeningBalance", sourceId: preview.jobId },
        include: { lines: true },
      })
    );

    expect(entry).not.toBeNull();
    expect(entry?.status).toBe("Posted");
    expect(entry?.lines).toHaveLength(3);

    // Check sum(debits) == sum(credits) in Decimal
    const totalDebit = sum(entry!.lines.map((l) => l.debit));
    const totalCredit = sum(entry!.lines.map((l) => l.credit));
    expect(totalDebit.equals(totalCredit)).toBe(true);
    expect(totalDebit.equals(dec(80000))).toBe(true);
  });

  it("Repeated commit is strictly idempotent and does not duplicate records", async () => {
    const t = await createTestTenant();

    const csv = `Nom,Type,ICE
Unique SARL,Client,007788990011223`;

    const preview = await previewImport("Company", csv, {
      tenantId: t.tenantId,
      userId: t.userId,
    });

    const commitInput = {
      jobId: preview.jobId,
      commitToken: preview.commitToken,
      contentHash: preview.contentHash,
    };

    // First commit
    const res1 = await commitImport(commitInput, { tenantId: t.tenantId, userId: t.userId });
    expect(res1.success).toBe(true);
    expect(res1.importedCount).toBe(1);

    // Second repeat commit
    const res2 = await commitImport(commitInput, { tenantId: t.tenantId, userId: t.userId });
    expect(res2.success).toBe(true);
    expect(res2.importedCount).toBe(1);

    // Check company count in DB is exactly 1
    const count = await withTenant(t.tenantId, (tx) =>
      tx.company.count({ where: { tenantId: t.tenantId, ICE: "007788990011223" } })
    );
    expect(count).toBe(1);
  });

  it("Cross-tenant access to another tenant's ImportJob is denied", async () => {
    const t1 = await createTestTenant();
    const t2 = await createTestTenant();

    const csv = `Nom,Type,ICE\nSecret SARL,Client,001111111111111`;
    const preview = await previewImport("Company", csv, {
      tenantId: t1.tenantId,
      userId: t1.userId,
    });

    // Tenant 2 attempts to commit Tenant 1's ImportJob
    await expect(
      commitImport(
        {
          jobId: preview.jobId,
          commitToken: preview.commitToken,
          contentHash: preview.contentHash,
        },
        { tenantId: t2.tenantId, userId: t2.userId }
      )
    ).rejects.toThrow(/introuvable/i);
  });

  it("Concurrent import commits cannot duplicate records", async () => {
    const t = await createTestTenant();

    const csv = `Nom,Type,ICE\nConcurrence SARL,Client,005555555555555`;
    const preview = await previewImport("Company", csv, {
      tenantId: t.tenantId,
      userId: t.userId,
    });

    const commitInput = {
      jobId: preview.jobId,
      commitToken: preview.commitToken,
      contentHash: preview.contentHash,
    };

    // Trigger concurrent commits
    const results = await Promise.allSettled([
      commitImport(commitInput, { tenantId: t.tenantId, userId: t.userId }),
      commitImport(commitInput, { tenantId: t.tenantId, userId: t.userId }),
    ]);

    // At least one succeeded
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    expect(fulfilled.length).toBeGreaterThanOrEqual(1);

    // Assert that exactly one record exists in DB
    const count = await withTenant(t.tenantId, (tx) =>
      tx.company.count({ where: { tenantId: t.tenantId, ICE: "005555555555555" } })
    );
    expect(count).toBe(1);
  });
});
