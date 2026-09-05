"use server";

import { scopedPrisma } from "@/shared/db/prisma";
import { getTenantId } from "@/lib/auth";
import { messageOf } from "@/shared/errors";

export interface CSVImportResult {
  jobId: string;
  totalRows: number;
  importedCount: number;
  errors: string[];
}

function parseCSV(content: string): Array<Record<string, string>> {
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) return [];

  const headerLine = lines[0];
  const delimiter = headerLine.includes(";") ? ";" : headerLine.includes("\t") ? "\t" : ",";
  const headers = headerLine.split(delimiter).map((h) => h.trim().replace(/^["']|["']$/g, ""));

  const rows: Array<Record<string, string>> = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(delimiter).map((v) => v.trim().replace(/^["']|["']$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || "";
    });
    rows.push(row);
  }

  return rows;
}

export async function importTrialBalanceFromCSV(csvContent: string): Promise<CSVImportResult> {
  const tenantId = await getTenantId();
  const userId = "sys-admin";
  const rows = parseCSV(csvContent);

  const errors: string[] = [];
  let importedCount = 0;

  // Validate Total Debits = Total Credits
  let totalDebits = 0;
  let totalCredits = 0;

  const validRows = [];

  for (let idx = 0; idx < rows.length; idx++) {
    const r = rows[idx];
    const lineNum = idx + 2;

    const accountCode = r.code || r.Code || r.Account;
    const debitStr = r.debit || r.Debit || r.DEBIT || "0";
    const creditStr = r.credit || r.Credit || r.CREDIT || "0";

    if (!accountCode) {
      errors.push(`Line ${lineNum}: Missing account code.`);
      continue;
    }

    const debit = parseFloat(debitStr) || 0;
    const credit = parseFloat(creditStr) || 0;

    totalDebits += debit;
    totalCredits += credit;

    validRows.push({ accountCode, debit, credit, lineNum });
  }

  const EPSILON = 0.01;
  if (Math.abs(totalDebits - totalCredits) > EPSILON) {
    errors.push(`Trial Balance mismatch: Total Debits (${totalDebits}) do not equal Total Credits (${totalCredits}). The import cannot proceed.`);
  }

  // Create Job Record
  const job = await scopedPrisma(tenantId).importJob.create({
    data: {
      tenantId,
      userId,
      entityType: "TrialBalance",
      status: errors.length > 0 ? "Failed" : "Completed",
      totalRows: rows.length,
      successRows: 0,
      errorRows: errors.length,
      errorLog: errors
    }
  });

  if (errors.length > 0) {
    return {
      jobId: job.id,
      totalRows: rows.length,
      importedCount: 0,
      errors,
    };
  }

  // If balanced, generate Journal Entry and Opening Balance Equity
  try {
    const je = await scopedPrisma(tenantId).journalEntry.create({
      data: {
        tenantId,
        number: `OB-${Date.now()}`,
        description: "Trial Balance Import",
        sourceType: "Manual",
        status: "Posted"
      }
    });

    for (const vr of validRows) {
      // Find or create account
      let account = await scopedPrisma(tenantId).account.findUnique({
        where: {
          tenantId_code: {
            tenantId,
            code: vr.accountCode
          }
        }
      });

      if (!account) {
        account = await scopedPrisma(tenantId).account.create({
          data: {
            tenantId,
            code: vr.accountCode,
            name: `Imported Account ${vr.accountCode}`,
            type: "Asset" // Default fallback
          }
        });
      }

      await scopedPrisma(tenantId).journalEntryLine.create({
        data: {
          tenantId,
          journalEntryId: je.id,
          accountId: account.id,
          debit: vr.debit,
          credit: vr.credit,
          description: "Opening Balance"
        }
      });
      importedCount++;
    }

    await scopedPrisma(tenantId).importJob.update({
      where: { id: job.id },
      data: {
        successRows: importedCount,
        status: "Completed"
      }
    });

  } catch (err: unknown) {
    errors.push(`Database Error: ${messageOf(err)}`);
    await scopedPrisma(tenantId).importJob.update({
      where: { id: job.id },
      data: { status: "Failed", errorLog: errors }
    });
  }

  return {
    jobId: job.id,
    totalRows: rows.length,
    importedCount,
    errors,
  };
}

// Keeping the older ones intact, just added getUserId to them
export async function importProductsFromCSV(csvContent: string): Promise<CSVImportResult> {
  const tenantId = await getTenantId();
  const userId = "sys-admin";
  const rows = parseCSV(csvContent);

  const errors: string[] = [];
  let importedCount = 0;

  const defaultWarehouse = await scopedPrisma(tenantId).warehouse.findFirst({
    where: { tenantId },
  });

  for (let idx = 0; idx < rows.length; idx++) {
    const r = rows[idx];
    const lineNum = idx + 2;

    const name = r.name || r.Name || r.Nom || r.Designation;
    if (!name) {
      errors.push(`Line ${lineNum}: Missing product name.`);
      continue;
    }

    const reference = r.reference || r.Reference || r.Ref || `PROD-${Date.now()}-${idx}`;
    const typeStr = (r.type || r.Type || "good").toLowerCase();
    const type = typeStr.includes("serv") ? "service" : "good";
    const salesPrice = parseFloat(r.unitPrice || r.Price || r.Prix || "0") || 0;
    const purchasePrice = parseFloat(r.costPrice || r.Cout || "0") || 0;
    const tvaRate = parseFloat(r.tvaRate || r.TVA || "20") || 20;
    const initialQty = parseInt(r.initialStock || r.Stock || "0", 10) || 0;

    try {
      const product = await scopedPrisma(tenantId).product.create({
        data: {
          tenantId,
          name,
          reference,
          type,
          salesPrice,
          purchasePrice,
          tvaRate,
          trackStock: type === "good",
        },
      });

      if (type === "good" && defaultWarehouse && initialQty > 0) {
        await scopedPrisma(tenantId).stockLevel.upsert({
          where: {
            productId_warehouseId: {
              productId: product.id,
              warehouseId: defaultWarehouse.id,
            },
          },
          update: { quantity: { increment: initialQty } },
          create: {
            tenantId,
            productId: product.id,
            warehouseId: defaultWarehouse.id,
            quantity: initialQty,
          },
        });

        await scopedPrisma(tenantId).stockMovement.create({
          data: {
            tenantId,
            productId: product.id,
            warehouseId: defaultWarehouse.id,
            quantity: initialQty,
            reason: "InitialImport",
            note: "Opening balance from CSV data import",
            sourceDocumentType: "CSVImport",
          },
        });
      }

      importedCount++;
    } catch (err: unknown) {
      errors.push(`Line ${lineNum} (${name}): ${messageOf(err)}`);
    }
  }

  const job = await scopedPrisma(tenantId).importJob.create({
    data: {
      tenantId,
      userId,
      entityType: "Product",
      status: errors.length > 0 ? "CompletedWithErrors" : "Completed",
      totalRows: rows.length,
      successRows: importedCount,
      errorRows: errors.length,
      errorLog: errors
    }
  });

  return {
    jobId: job.id,
    totalRows: rows.length,
    importedCount,
    errors,
  };
}

export async function importCompaniesFromCSV(csvContent: string): Promise<CSVImportResult> {
  const tenantId = await getTenantId();
  const userId = "sys-admin";
  const rows = parseCSV(csvContent);

  const errors: string[] = [];
  let importedCount = 0;

  for (let idx = 0; idx < rows.length; idx++) {
    const r = rows[idx];
    const lineNum = idx + 2;

    const name = r.name || r.Name || r.Nom || r.Societe || r.RaisonSociale;
    if (!name) {
      errors.push(`Line ${lineNum}: Missing company name.`);
      continue;
    }

    const typeRaw = (r.type || r.Type || "Client").toLowerCase();
    const type = typeRaw.includes("fourn") || typeRaw.includes("supp") ? "Supplier" : "Customer";
    const ice = r.ice || r.ICE || "";
    const ifNumber = r.ifNumber || r.IF || "";
    const rcNumber = r.rcNumber || r.RC || "";
    const email = r.email || r.Email || "";
    const phone = r.phone || r.Phone || r.Telephone || "";
    const address = r.address || r.Address || r.Adresse || "";
    const city = r.city || r.City || r.Ville || "Casablanca";

    try {
      const comp = await scopedPrisma(tenantId).company.create({
        data: {
          tenantId,
          name,
          type,
          ICE: ice || null,
          IF: ifNumber || null,
          RC: rcNumber || null,
          address: address || null,
          city: city || null,
        },
      });

      if (email || phone) {
        await scopedPrisma(tenantId).contact.create({
          data: {
            tenantId,
            companyId: comp.id,
            firstName: "Principal",
            lastName: name,
            email: email || null,
            phone: phone || null,
          },
        });
      }

      importedCount++;
    } catch (err: unknown) {
      errors.push(`Line ${lineNum} (${name}): ${messageOf(err)}`);
    }
  }

  const job = await scopedPrisma(tenantId).importJob.create({
    data: {
      tenantId,
      userId,
      entityType: "Company",
      status: errors.length > 0 ? "CompletedWithErrors" : "Completed",
      totalRows: rows.length,
      successRows: importedCount,
      errorRows: errors.length,
      errorLog: errors
    }
  });

  return {
    jobId: job.id,
    totalRows: rows.length,
    importedCount,
    errors,
  };
}
