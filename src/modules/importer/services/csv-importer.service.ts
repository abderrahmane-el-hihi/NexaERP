"use server";

import { createHash, randomUUID } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { withTenant } from "@/shared/db/prisma";
import { getTenantId, getCurrentUser } from "@/lib/auth";
import { dec } from "@/shared/money";
import { domainError } from "@/shared/errors";
import { audit } from "@/modules/platform/services/audit.service";
import { postOpeningBalanceEntry, validateOpeningBalanceBatch } from "@/modules/finance/services/opening-balance.service";
import { recordOpeningStock } from "@/modules/inv/services/opening-stock.service";
import { parseCSVContent } from "./csv-parser";
import {
  type ImportEntityType,
  type PreviewImportResult,
  type CommitImportResult,
  type StagedImportPayload,
  type RowError,
  type RowWarning,
  CompanyRowSchema,
  ProductRowSchema,
  OpeningBalanceRowSchema,
} from "../types/importer.types";

export interface CSVImportResult {
  jobId: string;
  totalRows: number;
  importedCount: number;
  errors: string[];
}

export interface ImportOptions {
  userId?: string;
  tenantId?: string;
}

/**
 * Phase 1: Preview and Validate CSV import.
 * - Parses CSV and checks syntax.
 * - Validates schema for each row (Zod).
 * - Detects in-file duplicates and DB conflicts.
 * - For opening balance: checks exact Decimal balance and account existence in COA.
 * - Computes SHA-256 content hash and issues a single-use commitToken.
 * - Persists a staged ImportJob record in status "Validated" or "Failed".
 * - GUARANTEE: ZERO business records (companies, products, stock, journal entries) are written.
 */
export async function previewImport(
  entityType: ImportEntityType,
  csvContent: string,
  options?: ImportOptions
): Promise<PreviewImportResult> {
  let tenantId = options?.tenantId;
  let userId = options?.userId;

  if (!tenantId) {
    tenantId = await getTenantId();
  }

  if (!userId) {
    const authUser = await getCurrentUser();
    userId = authUser?.id;
  }

  if (!userId) {
    throw domainError("FORBIDDEN", "Utilisateur non authentifié pour effectuer un import.");
  }

  const contentHash = createHash("sha256").update(csvContent, "utf8").digest("hex");
  const commitToken = randomUUID();

  // 1. Parse CSV with RFC-4180 parser
  const parsed = parseCSVContent(csvContent);
  const errors: RowError[] = [...parsed.errors];
  const warnings: RowWarning[] = [];

  if (parsed.errors.length > 0 && parsed.rows.length === 0) {
    const job = await withTenant(tenantId, (tx) =>
      tx.importJob.create({
        data: {
          tenantId,
          userId,
          entityType,
          status: "Failed",
          totalRows: 0,
          successRows: 0,
          errorRows: parsed.errors.length,
          errorLog: { errors: parsed.errors } as unknown as Prisma.InputJsonValue,
        },
      })
    );
    return {
      jobId: job.id,
      commitToken,
      contentHash,
      entityType,
      isValid: false,
      totalRows: 0,
      validCount: 0,
      errorCount: parsed.errors.length,
      errors: parsed.errors,
      warnings: [],
      previewRows: [],
    };
  }

  const stagedRows: Record<string, unknown>[] = [];
  let financialSummary: PreviewImportResult["financialSummary"];

  // 2. Validate rows per entity type inside read-only tenant transaction
  await withTenant(tenantId, async (tx) => {
    if (entityType === "Company") {
      const seenNames = new Set<string>();
      const seenICEs = new Set<string>();

      // Pre-fetch existing ICEs in tenant DB
      const candidateICEs = parsed.rows
        .map((r) => r.data.ICE?.trim())
        .filter((ice): ice is string => Boolean(ice && ice.length === 15));

      const existingCompanies = candidateICEs.length > 0
        ? await tx.company.findMany({
            where: { tenantId, ICE: { in: candidateICEs } },
            select: { ICE: true, name: true },
          })
        : [];
      const dbIceMap = new Map(existingCompanies.map((c) => [c.ICE, c.name]));

      for (const row of parsed.rows) {
        const lineNum = row.lineNumber;
        const validation = CompanyRowSchema.safeParse(row.data);

        if (!validation.success) {
          for (const issue of validation.error.issues) {
            errors.push({
              row: lineNum,
              field: issue.path.join("."),
              message: issue.message,
            });
          }
          continue;
        }

        const data = validation.data;
        const nameLower = data.name.toLowerCase();

        // In-file duplicate check
        if (seenNames.has(nameLower)) {
          warnings.push({
            row: lineNum,
            field: "name",
            message: `Doublon détecté dans le fichier : la société '${data.name}' apparaît plusieurs fois.`,
          });
        }
        seenNames.add(nameLower);

        if (data.ICE) {
          if (seenICEs.has(data.ICE)) {
            errors.push({
              row: lineNum,
              field: "ICE",
              message: `L'ICE ${data.ICE} est présent plusieurs fois dans le fichier importé.`,
            });
            continue;
          }
          seenICEs.add(data.ICE);

          // Check DB conflict
          const existingName = dbIceMap.get(data.ICE);
          if (existingName) {
            warnings.push({
              row: lineNum,
              field: "ICE",
              message: `Un tiers existe déjà avec l'ICE ${data.ICE} (${existingName}).`,
            });
          }
        }

        stagedRows.push(data);
      }
    } else if (entityType === "Product") {
      const seenRefs = new Set<string>();

      const candidateRefs = parsed.rows
        .map((r) => r.data.reference?.trim())
        .filter(Boolean);

      const existingProducts = candidateRefs.length > 0
        ? await tx.product.findMany({
            where: { tenantId, reference: { in: candidateRefs } },
            select: { reference: true, name: true },
          })
        : [];
      const dbRefMap = new Map(existingProducts.map((p) => [p.reference, p.name]));

      for (const row of parsed.rows) {
        const lineNum = row.lineNumber;
        const validation = ProductRowSchema.safeParse(row.data);

        if (!validation.success) {
          for (const issue of validation.error.issues) {
            errors.push({
              row: lineNum,
              field: issue.path.join("."),
              message: issue.message,
            });
          }
          continue;
        }

        const data = validation.data;
        const refLower = data.reference.toLowerCase();

        if (seenRefs.has(refLower)) {
          errors.push({
            row: lineNum,
            field: "reference",
            message: `La référence article '${data.reference}' apparaît plusieurs fois dans le fichier.`,
          });
          continue;
        }
        seenRefs.add(refLower);

        if (dbRefMap.has(data.reference)) {
          errors.push({
            row: lineNum,
            field: "reference",
            message: `La référence '${data.reference}' existe déjà dans votre catalogue (${dbRefMap.get(data.reference)}).`,
          });
          continue;
        }

        stagedRows.push(data);
      }
    } else if (entityType === "OpeningBalance") {
      const balanceLines = [];

      for (const row of parsed.rows) {
        const lineNum = row.lineNumber;
        const validation = OpeningBalanceRowSchema.safeParse(row.data);

        if (!validation.success) {
          for (const issue of validation.error.issues) {
            errors.push({
              row: lineNum,
              field: issue.path.join("."),
              message: issue.message,
            });
          }
          continue;
        }

        const data = validation.data;
        balanceLines.push({
          accountCode: data.accountCode,
          debit: data.debit,
          credit: data.credit,
          description: data.description,
        });
        stagedRows.push(data);
      }

      // Validate complete batch balance and accounts
      if (balanceLines.length > 0) {
        const batchCheck = await validateOpeningBalanceBatch(tx, tenantId, balanceLines, new Date());
        financialSummary = {
          totalDebit: batchCheck.totalDebit,
          totalCredit: batchCheck.totalCredit,
          isBalanced: batchCheck.isBalanced,
        };

        for (const err of batchCheck.errors) {
          errors.push({ row: 1, message: err });
        }
        for (const warn of batchCheck.warnings) {
          warnings.push({ row: 1, message: warn });
        }
      }
    }
  });

  const isValid = errors.length === 0 && stagedRows.length > 0;
  const status = isValid ? "Validated" : "Failed";

  const stagedPayload: StagedImportPayload = {
    contentHash,
    commitToken,
    delimiter: parsed.delimiter,
    totalParsedRows: parsed.rows.length,
    validCount: stagedRows.length,
    errorCount: errors.length,
    errors,
    warnings,
    stagedRows,
    financialSummary,
  };

  // 3. Persist staged job record
  const job = await withTenant(tenantId, (tx) =>
    tx.importJob.create({
      data: {
        tenantId,
        userId,
        entityType,
        status,
        totalRows: parsed.rows.length,
        successRows: isValid ? stagedRows.length : 0,
        errorRows: errors.length,
        errorLog: stagedPayload as unknown as Prisma.InputJsonValue,
      },
    })
  );

  return {
    jobId: job.id,
    commitToken,
    contentHash,
    entityType,
    isValid,
    totalRows: parsed.rows.length,
    validCount: stagedRows.length,
    errorCount: errors.length,
    errors,
    warnings,
    previewRows: stagedRows.slice(0, 10), // Safe preview snippet
    financialSummary,
  };
}

/**
 * Phase 2: Commit a validated ImportJob.
 * - Enforces tenant authorization.
 * - Verifies job status is "Validated".
 * - Idempotency: repeated commit returns the cached result without duplicate records.
 * - Concurrency protection: atomically locks job into "Processing".
 * - Calls canonical domain services (postEntry, applyMovement, createCompany, createProduct).
 * - Completes job atomically and writes audit logs.
 */
export async function commitImport(
  input: {
    jobId: string;
    commitToken: string;
    contentHash: string;
  },
  options?: ImportOptions
): Promise<CommitImportResult> {
  let tenantId = options?.tenantId;
  let userId = options?.userId;

  if (!tenantId) {
    tenantId = await getTenantId();
  }

  if (!userId) {
    const authUser = await getCurrentUser();
    userId = authUser?.id;
  }

  if (!userId) {
    throw domainError("FORBIDDEN", "Utilisateur non authentifié pour exécuter l'importation.");
  }

  return withTenant(tenantId, async (tx) => {
    // 1. Fetch job with tenant isolation
    const job = await tx.importJob.findFirst({
      where: { id: input.jobId, tenantId },
    });

    if (!job) {
      throw domainError("NOT_FOUND", "Travail d'importation introuvable pour ce tenant.");
    }

    // 2. Idempotency check: if already completed, return original commit result
    if (job.status === "Completed") {
      const payload = job.errorLog as unknown as StagedImportPayload | null;
      if (payload?.commitResult) {
        return payload.commitResult;
      }
      return {
        success: true,
        jobId: job.id,
        entityType: job.entityType as ImportEntityType,
        importedCount: job.successRows,
        totalRows: job.totalRows,
        message: "Importation déjà effectuée avec succès (idempotente).",
      };
    }

    // 3. Only Validated jobs may commit
    if (job.status !== "Validated") {
      throw domainError(
        "VALIDATION_FAILED",
        `Impossible d'exécuter un import dans l'état '${job.status}'. Seul un import 'Validé' peut être engagé.`
      );
    }

    // 4. Atomic concurrency lock
    const lock = await tx.importJob.updateMany({
      where: { id: input.jobId, tenantId, status: "Validated" },
      data: { status: "Processing" },
    });

    if (lock.count === 0) {
      throw domainError(
        "INVALID_STATE_TRANSITION",
        "Ce travail d'importation est déjà en cours de traitement par une autre session."
      );
    }

    const payload = job.errorLog as unknown as StagedImportPayload;
    if (!payload || payload.commitToken !== input.commitToken || payload.contentHash !== input.contentHash) {
      throw domainError(
        "VALIDATION_FAILED",
        "Jeton de confirmation ou empreinte de contenu invalide. L'importation ne correspond pas à la validation."
      );
    }

    let importedCount = 0;
    const createdIds: string[] = [];

    // 5. Execute canonical creation per entity type
    if (job.entityType === "Company") {
      for (const row of payload.stagedRows as Array<{
        name: string;
        type: string;
        ICE?: string;
        IF?: string;
        RC?: string;
        city?: string;
        address?: string;
        phone?: string;
        email?: string;
        contactFirstName?: string;
        contactLastName?: string;
      }>) {
        // Create company
        const comp = await tx.company.create({
          data: {
            tenantId,
            name: row.name,
            type: row.type,
            ICE: row.ICE || null,
            IF: row.IF || null,
            RC: row.RC || null,
            city: row.city || "Casablanca",
            address: row.address || null,
            phone: row.phone || null,
            email: row.email || null,
            defaultPaymentTermsDays: 30,
          },
        });

        // Create contact if contact fields or communication fields exist
        if (row.email || row.phone || row.contactFirstName || row.contactLastName) {
          await tx.contact.create({
            data: {
              tenantId,
              companyId: comp.id,
              firstName: row.contactFirstName || "Principal",
              lastName: row.contactLastName || row.name,
              email: row.email || null,
              phone: row.phone || null,
            },
          });
        }

        await audit(tx, {
          tenantId,
          userId,
          entityType: "Company",
          entityId: comp.id,
          action: "CREATE",
          diff: { name: comp.name, type: comp.type, ICE: comp.ICE, importJobId: job.id },
          reason: "Importation CSV en lot",
        });

        createdIds.push(comp.id);
        importedCount++;
      }
    } else if (job.entityType === "Product") {
      // Find default warehouse for opening stock
      const defaultWarehouse = await tx.warehouse.findFirst({
        where: { tenantId },
        orderBy: { createdAt: "asc" },
      });

      for (const row of payload.stagedRows as Array<{
        name: string;
        reference: string;
        type: string;
        salesPrice: string;
        purchasePrice: string;
        tvaRate: string;
        unit: string;
        category?: string;
        initialStock: string;
      }>) {
        const product = await tx.product.create({
          data: {
            tenantId,
            name: row.name,
            reference: row.reference,
            type: row.type,
            salesPrice: new Prisma.Decimal(dec(row.salesPrice).toFixed(6)),
            purchasePrice: new Prisma.Decimal(dec(row.purchasePrice).toFixed(6)),
            tvaRate: new Prisma.Decimal(dec(row.tvaRate).toFixed(6)),
            unit: row.unit || "unit",
            category: row.category || null,
            trackStock: row.type === "good",
          },
        });

        await audit(tx, {
          tenantId,
          userId,
          entityType: "Product",
          entityId: product.id,
          action: "CREATE",
          diff: { reference: product.reference, name: product.name, type: product.type, importJobId: job.id },
          reason: "Importation CSV en lot",
        });

        // If opening stock requested and warehouse exists, route through canonical opening stock service
        const initialQty = dec(row.initialStock);
        if (row.type === "good" && initialQty.greaterThan(0) && defaultWarehouse) {
          await recordOpeningStock(tx, {
            tenantId,
            productId: product.id,
            warehouseId: defaultWarehouse.id,
            quantity: initialQty,
            unitCost: dec(row.purchasePrice),
            userId,
            importJobId: job.id,
          });
        }

        createdIds.push(product.id);
        importedCount++;
      }
    } else if (job.entityType === "OpeningBalance") {
      const lines = payload.stagedRows as Array<{
        accountCode: string;
        debit: string;
        credit: string;
        description?: string;
      }>;

      const entry = await postOpeningBalanceEntry(tx, {
        tenantId,
        lines,
        userId,
        importJobId: job.id,
        description: "Bilan d'ouverture — Importation CSV initiale",
      });

      createdIds.push(entry.id);
      importedCount = lines.length;
    }

    const commitResult: CommitImportResult = {
      success: true,
      jobId: job.id,
      entityType: job.entityType as ImportEntityType,
      importedCount,
      totalRows: payload.totalParsedRows,
      message: `Importation réussie : ${importedCount} élément(s) enregistré(s) avec succès.`,
      details: {
        createdCount: createdIds.length,
      },
    };

    // 6. Update ImportJob status to Completed
    await tx.importJob.update({
      where: { id: job.id },
      data: {
        status: "Completed",
        successRows: importedCount,
        errorRows: 0,
        errorLog: {
          ...payload,
          commitResult,
          committedAt: new Date().toISOString(),
        } as unknown as Prisma.InputJsonValue,
      },
    });

    return commitResult;
  });
}

// ---------------------------------------------------------
// Backwards-Compatible Helpers (Routed via Two-Phase Flow)
// ---------------------------------------------------------

export async function importCompaniesFromCSV(csvContent: string): Promise<CSVImportResult> {
  const preview = await previewImport("Company", csvContent);
  if (!preview.isValid) {
    return {
      jobId: preview.jobId,
      totalRows: preview.totalRows,
      importedCount: 0,
      errors: preview.errors.map((e) => `Ligne ${e.row}${e.field ? ` (${e.field})` : ""}: ${e.message}`),
    };
  }

  const result = await commitImport({
    jobId: preview.jobId,
    commitToken: preview.commitToken,
    contentHash: preview.contentHash,
  });

  return {
    jobId: result.jobId,
    totalRows: result.totalRows,
    importedCount: result.importedCount,
    errors: [],
  };
}

export async function importProductsFromCSV(csvContent: string): Promise<CSVImportResult> {
  const preview = await previewImport("Product", csvContent);
  if (!preview.isValid) {
    return {
      jobId: preview.jobId,
      totalRows: preview.totalRows,
      importedCount: 0,
      errors: preview.errors.map((e) => `Ligne ${e.row}${e.field ? ` (${e.field})` : ""}: ${e.message}`),
    };
  }

  const result = await commitImport({
    jobId: preview.jobId,
    commitToken: preview.commitToken,
    contentHash: preview.contentHash,
  });

  return {
    jobId: result.jobId,
    totalRows: result.totalRows,
    importedCount: result.importedCount,
    errors: [],
  };
}

export async function importTrialBalanceFromCSV(csvContent: string): Promise<CSVImportResult> {
  const preview = await previewImport("OpeningBalance", csvContent);
  if (!preview.isValid) {
    return {
      jobId: preview.jobId,
      totalRows: preview.totalRows,
      importedCount: 0,
      errors: preview.errors.map((e) => `Ligne ${e.row}${e.field ? ` (${e.field})` : ""}: ${e.message}`),
    };
  }

  const result = await commitImport({
    jobId: preview.jobId,
    commitToken: preview.commitToken,
    contentHash: preview.contentHash,
  });

  return {
    jobId: result.jobId,
    totalRows: result.totalRows,
    importedCount: result.importedCount,
    errors: [],
  };
}
