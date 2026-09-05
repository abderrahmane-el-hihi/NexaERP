import type { Tx } from "@/shared/db/prisma";

/**
 * Gapless document numbering.
 *
 * Two properties matter and both are legal requirements in Morocco, where the DGI
 * platform validates sequential numbering before an invoice is accepted:
 *
 *  1. The number is consumed inside the CALLER'S transaction. If the document fails
 *     to save, the transaction rolls back and the number is not burned. Passing `tx`
 *     is therefore mandatory — a sequence taken on another connection leaves gaps.
 *  2. The sequence row is locked FOR UPDATE, so two concurrent postings serialise
 *     instead of racing to the same value.
 */

const PREFIXES: Record<string, string> = {
  Devis: "DEV",
  SalesOrder: "CMD",
  DeliveryNote: "BL",
  Invoice: "FA",
  CreditNote: "AV",
  Payment: "REG",
  PurchaseOrder: "BC",
  SupplierReceipt: "BR",
  SupplierBill: "FF",
  JournalEntry: "OD",
  PhysicalInventory: "INV",
  BillingInvoice: "NEXA",
};

export function prefixFor(type: string): string {
  return PREFIXES[type] ?? type.substring(0, 3).toUpperCase();
}

/**
 * Reserves the next number for (tenant, type, year) and returns it formatted.
 * Must be called inside a transaction that also writes the document.
 */
export async function nextNumber(
  tx: Tx,
  tenantId: string,
  type: string,
  year: number = new Date().getFullYear()
): Promise<string> {
  // Lock the row for this (tenant, type, year), creating it if it does not exist.
  // ON CONFLICT ... DO UPDATE re-locks and increments atomically in one statement.
  const rows = await tx.$queryRawUnsafe<{ nextValue: number }[]>(
    `
    INSERT INTO "TenantSequence" ("id", "tenantId", "type", "year", "nextValue", "updatedAt")
    VALUES (gen_random_uuid()::text, $1, $2, $3, 2, now())
    ON CONFLICT ("tenantId", "type", "year")
    DO UPDATE SET "nextValue" = "TenantSequence"."nextValue" + 1, "updatedAt" = now()
    RETURNING "nextValue"
    `,
    tenantId,
    type,
    year
  );

  const stored = rows[0]?.nextValue;
  if (stored === undefined) {
    throw new Error(`Could not reserve a ${type} number for tenant ${tenantId}`);
  }

  const value = stored - 1;
  return format(type, year, value);
}

export function format(type: string, year: number, value: number): string {
  return `${prefixFor(type)}-${year}-${String(value).padStart(5, "0")}`;
}

/**
 * Peeks at the next number without consuming it. For previews only — never persist
 * a number obtained this way.
 */
export async function peekNumber(
  tx: Tx,
  tenantId: string,
  type: string,
  year: number = new Date().getFullYear()
): Promise<string> {
  const seq = await tx.tenantSequence.findUnique({
    where: { tenantId_type_year: { tenantId, type, year } },
    select: { nextValue: true },
  });
  return format(type, year, seq?.nextValue ?? 1);
}
