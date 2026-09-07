import { z } from "zod";

export type ImportEntityType = "Company" | "Product" | "OpeningBalance";

export type ImportJobStatus = "Draft" | "Validated" | "Processing" | "Completed" | "Failed";

export interface RowError {
  row: number;
  field?: string;
  message: string;
}

export interface RowWarning {
  row: number;
  field?: string;
  message: string;
}

// ---------------------------------------------------------
// Company (Clients & Fournisseurs)
// ---------------------------------------------------------

export const CompanyRowSchema = z.object({
  name: z.string().trim().min(1, "La raison sociale ou le nom est obligatoire."),
  type: z
    .string()
    .trim()
    .default("Customer")
    .transform((val) => {
      const lower = val.toLowerCase();
      if (lower.includes("fourn") || lower.includes("supp") || lower.includes("vendor")) {
        return "Supplier";
      }
      if (lower.includes("part")) {
        return "Partner";
      }
      return "Customer";
    }),
  ICE: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine(
      (val) => !val || /^\d{15}$/.test(val),
      "L'ICE doit comporter exactement 15 chiffres (contrôle de format syntaxique)."
    ),
  IF: z.string().trim().optional().or(z.literal("")),
  RC: z.string().trim().optional().or(z.literal("")),
  city: z.string().trim().optional().or(z.literal("")).default("Casablanca"),
  address: z.string().trim().optional().or(z.literal("")),
  phone: z.string().trim().optional().or(z.literal("")),
  email: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine(
      (val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
      "Format d'adresse email invalide."
    ),
  contactFirstName: z.string().trim().optional().or(z.literal("")),
  contactLastName: z.string().trim().optional().or(z.literal("")),
});

export type ValidatedCompanyRow = z.infer<typeof CompanyRowSchema>;

// ---------------------------------------------------------
// Product & Service (Articles & Prestations)
// ---------------------------------------------------------

const ALLOWED_TVA_RATES = ["0", "7", "10", "14", "20"] as const;

export const ProductRowSchema = z
  .object({
    name: z.string().trim().min(1, "Le nom du produit est obligatoire."),
    reference: z
      .string()
      .trim()
      .min(1, "La référence article est obligatoire."),
    type: z
      .string()
      .trim()
      .default("good")
      .transform((val) => {
        const lower = val.toLowerCase();
        return lower.includes("serv") ? "service" : "good";
      }),
    salesPrice: z
      .string()
      .trim()
      .default("0")
      .refine(
        (val) => !Number.isNaN(Number(val)) && Number(val) >= 0,
        "Le prix de vente doit être un nombre positif ou nul."
      ),
    purchasePrice: z
      .string()
      .trim()
      .default("0")
      .refine(
        (val) => !Number.isNaN(Number(val)) && Number(val) >= 0,
        "Le prix d'achat doit être un nombre positif ou nul."
      ),
    tvaRate: z
      .string()
      .trim()
      .default("20")
      .transform((val) => {
        // Normalize values like "20%", "20.0" to "20"
        const clean = val.replace("%", "").trim();
        const num = parseFloat(clean);
        return String(Number.isNaN(num) ? 20 : num);
      })
      .refine(
        (val) => ALLOWED_TVA_RATES.includes(val as (typeof ALLOWED_TVA_RATES)[number]),
        `Taux de TVA invalide. Taux autorisés au Maroc : ${ALLOWED_TVA_RATES.join(", ")}%`
      ),
    unit: z.string().trim().default("unit"),
    category: z.string().trim().optional().or(z.literal("")),
    initialStock: z
      .string()
      .trim()
      .default("0")
      .refine(
        (val) => !Number.isNaN(Number(val)) && Number(val) >= 0,
        "La quantité de stock initial doit être un nombre positif ou nul."
      ),
    warehouse: z.string().trim().optional().or(z.literal("")),
  })
  .refine(
    (data) => !(data.type === "service" && Number(data.initialStock) > 0),
    {
      message: "Un service ne peut pas avoir de stock initial.",
      path: ["initialStock"],
    }
  );

export type ValidatedProductRow = z.infer<typeof ProductRowSchema>;

// ---------------------------------------------------------
// Opening Balance (Balance d'ouverture)
// ---------------------------------------------------------

export const OpeningBalanceRowSchema = z
  .object({
    accountCode: z
      .string()
      .trim()
      .min(1, "Le code compte est obligatoire.")
      .regex(/^\d{3,8}$/, "Le code compte doit être numérique (3 à 8 chiffres)."),
    debit: z
      .string()
      .trim()
      .default("0")
      .refine(
        (val) => !Number.isNaN(Number(val)) && Number(val) >= 0,
        "Le débit doit être un montant positif ou nul."
      ),
    credit: z
      .string()
      .trim()
      .default("0")
      .refine(
        (val) => !Number.isNaN(Number(val)) && Number(val) >= 0,
        "Le crédit doit être un montant positif ou nul."
      ),
    description: z.string().trim().optional().or(z.literal("")),
  })
  .refine(
    (data) => {
      const d = Number(data.debit);
      const c = Number(data.credit);
      return !(d > 0 && c > 0);
    },
    {
      message: "Une ligne ne peut pas comporter simultanément un débit et un crédit.",
      path: ["debit"],
    }
  )
  .refine(
    (data) => {
      const d = Number(data.debit);
      const c = Number(data.credit);
      return !(d === 0 && c === 0);
    },
    {
      message: "Une ligne doit comporter soit un débit, soit un crédit non nul.",
      path: ["debit"],
    }
  );

export type ValidatedOpeningBalanceRow = z.infer<typeof OpeningBalanceRowSchema>;

// ---------------------------------------------------------
// Staged Job Payload & Transfer Objects
// ---------------------------------------------------------

export interface StagedImportPayload {
  contentHash: string;
  commitToken: string;
  delimiter: string;
  totalParsedRows: number;
  validCount: number;
  errorCount: number;
  errors: RowError[];
  warnings: RowWarning[];
  stagedRows: Record<string, unknown>[];
  financialSummary?: {
    totalDebit: string;
    totalCredit: string;
    isBalanced: boolean;
  };
  commitResult?: CommitImportResult;
}

export interface PreviewImportResult {
  jobId: string;
  commitToken: string;
  contentHash: string;
  entityType: ImportEntityType;
  isValid: boolean;
  totalRows: number;
  validCount: number;
  errorCount: number;
  errors: RowError[];
  warnings: RowWarning[];
  previewRows: Record<string, unknown>[];
  financialSummary?: {
    totalDebit: string;
    totalCredit: string;
    isBalanced: boolean;
  };
}

export interface CommitImportResult {
  success: boolean;
  jobId: string;
  entityType: ImportEntityType;
  importedCount: number;
  totalRows: number;
  message: string;
  details?: Record<string, unknown>;
}
