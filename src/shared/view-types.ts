import type { Prisma } from "@/generated/prisma/client";
import type { Serialized } from "./money";

/**
 * The shapes the UI actually receives.
 *
 * Every type here is derived from a Prisma model and passed through `Serialized`, so a
 * component prop cannot drift from what the service returns: change the query and the
 * components that consume it stop compiling.
 */

export type ProductView = Serialized<Prisma.ProductGetPayload<object>>;
export type CompanyView = Serialized<Prisma.CompanyGetPayload<object>>;
export type ContactView = Serialized<
  Prisma.ContactGetPayload<{ include: { company: true } }>
>;
export type OpportunityView = Serialized<
  Prisma.OpportunityGetPayload<{ include: { company: true; contact: true; owner: true } }>
>;
export type TenantView = Serialized<Prisma.TenantGetPayload<object>>;
export type EmployeeView = Serialized<Prisma.EmployeeGetPayload<object>>;
export type WarehouseView = Serialized<Prisma.WarehouseGetPayload<object>>;

export type InvoiceView = Serialized<
  Prisma.InvoiceGetPayload<{ include: { company: true; tenant: true } }>
>;
export type InvoiceDetailView = Serialized<
  Prisma.InvoiceGetPayload<{
    include: {
      company: true;
      tenant: true;
      lines: { include: { product: true } };
      allocations: { include: { payment: true } };
      submissions: true;
    };
  }>
>;
export type InvoiceLineView = InvoiceDetailView["lines"][number];

export type DevisView = Serialized<
  Prisma.DevisGetPayload<{ include: { company: true; lines: true; tenant: true } }>
>;
export type SalesOrderView = Serialized<
  Prisma.SalesOrderGetPayload<{
    include: { company: true; deliveryNotes: true; invoices: true; lines: true };
  }>
>;
export type CreditNoteView = Serialized<
  Prisma.CreditNoteGetPayload<{ include: { company: true; invoice: true; lines: true } }>
>;

export type PurchaseOrderView = Serialized<
  Prisma.PurchaseOrderGetPayload<{
    include: {
      company: true;
      lines: { include: { product: true } };
      receipts: true;
      bills: true;
    };
  }>
>;
export type SupplierBillView = Serialized<
  Prisma.SupplierBillGetPayload<{
    include: { company: true; purchaseOrder: true; lines: true };
  }>
>;

export type JournalEntryView = Serialized<
  Prisma.JournalEntryGetPayload<{ include: { lines: { include: { account: true } } } }>
>;
export type JournalEntryLineView = JournalEntryView["lines"][number];

/** A row of any of the statutory reports. */
export interface AccountBalanceRow {
  code: string;
  name: string;
  type: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface TrialBalanceRow {
  id: string;
  code: string;
  name: string;
  type: string;
  totalDebit: number;
  totalCredit: number;
  balance: number;
  /** Signed by account nature: positive means "normal side". */
  netBalance: number;
}

export interface AgeingBuckets {
  current: number;
  days1_30: number;
  days31_60: number;
  days61_plus: number;
}

export interface AgeingRow {
  id: string;
  number: string;
  company: string;
  companyId: string;
  date: Date;
  dueDate: Date;
  amountDue: number;
  days: number;
  bucket: keyof AgeingBuckets;
}

export interface AgeingReport {
  buckets: AgeingBuckets;
  total: number;
  invoices?: AgeingRow[];
  bills?: AgeingRow[];
}

export interface ReceivablesByCustomerRow {
  companyId: string;
  companyName: string;
  current: number;
  days30: number;
  days60: number;
  days90Plus: number;
  totalDue: number;
}

export interface IncomeStatementView {
  operatingRevenues: AccountBalanceRow[];
  totalOperatingRevenue: number;
  operatingExpenses: AccountBalanceRow[];
  totalOperatingExpenses: number;
  operatingResult: number;
  allRevenues: AccountBalanceRow[];
  allExpenses: AccountBalanceRow[];
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
}

export interface BalanceSheetView {
  immobilisations: AccountBalanceRow[];
  totalImmobilisations: number;
  actifCirculant: AccountBalanceRow[];
  totalActifCirculant: number;
  tresorerieActif: AccountBalanceRow[];
  totalTresorerieActif: number;
  totalActif: number;
  financementPermanent: AccountBalanceRow[];
  totalFinancementPermanent: number;
  passifCirculant: AccountBalanceRow[];
  totalPassifCirculant: number;
  tresoreriePassif: AccountBalanceRow[];
  totalTresoreriePassif: number;
  equityResult: number;
  totalPassif: number;
  balanced: boolean;
}
