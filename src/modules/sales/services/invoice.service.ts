"use server";

import { Prisma } from "@/generated/prisma/client";
import { withTenant, type Tx } from "@/shared/db/prisma";
import { getTenantId } from "@/lib/auth";
import { dec, serialize } from "@/shared/money";
import { domainError } from "@/shared/errors";
import { nextNumber } from "@/modules/platform/services/sequence.service";
import { audit } from "@/modules/platform/services/audit.service";
import { postEntry, reverseEntry } from "@/modules/finance/services/posting.service";
import {
  computeDocumentTotals,
  computeLine,
  assertTotalsConsistent,
} from "@/modules/finance/services/tax.service";
import { applyMovement } from "@/modules/inv/services/stock-ledger.service";
import { submitInvoiceForClearance } from "@/modules/einvoice/services/clearance.service";

/**
 * Customer invoices.
 *
 * One posting path: an invoice becomes real in `postInvoice` and nowhere else.
 * The previous implementation could set status "Finalized" while creating the record,
 * which produced invoices that existed commercially but not in the ledger.
 *
 * Lifecycle:
 *   Draft ──post──▶ [clearance if enabled] ──▶ Posted ──payments──▶ Paid
 *                                      └─▶ Rejected ──corrected──▶ Draft
 * A posted invoice is never edited or deleted: corrections are credit notes.
 */

const EDITABLE_STATES = ["Draft", "Rejected"];
const POSTED_STATES = ["Posted", "Paid"];

export interface InvoiceLineInput {
  productId?: string | null;
  description: string;
  quantity: number | string;
  unitPrice: number | string;
  tvaRate?: number | string;
  discountPercent?: number | string;
}

export interface CreateInvoiceInput {
  companyId: string;
  date?: Date;
  dueDate?: Date;
  salesOrderId?: string;
  devisId?: string;
  deliveryNoteId?: string;
  notes?: string;
  lines: InvoiceLineInput[];
}

function assertLines(lines: InvoiceLineInput[]) {
  if (!lines || lines.length === 0) {
    throw domainError("VALIDATION_FAILED", "Une facture doit comporter au moins une ligne");
  }
  for (const line of lines) {
    if (dec(line.quantity).isZero()) {
      throw domainError("VALIDATION_FAILED", `Quantité nulle sur la ligne "${line.description}"`);
    }
    if (dec(line.quantity).isNegative()) {
      throw domainError("VALIDATION_FAILED", `Quantité négative sur "${line.description}"`);
    }
  }
}

function buildLineData(lines: InvoiceLineInput[], tenantId: string) {
  return lines.map((line, index) => {
    const computed = computeLine({
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      discountPercent: line.discountPercent ?? 0,
      tvaRate: line.tvaRate ?? 20,
    });
    return {
      tenantId,
      productId: line.productId ?? null,
      description: line.description,
      quantity: new Prisma.Decimal(dec(line.quantity).toFixed(6)),
      unitPrice: new Prisma.Decimal(dec(line.unitPrice).toFixed(6)),
      tvaRate: new Prisma.Decimal(dec(line.tvaRate ?? 20).toFixed(6)),
      discountPercent: new Prisma.Decimal(dec(line.discountPercent ?? 0).toFixed(6)),
      lineSubtotal: new Prisma.Decimal(computed.lineSubtotal.toFixed(6)),
      lineTva: new Prisma.Decimal(computed.lineTva.toFixed(6)),
      lineTotal: new Prisma.Decimal(computed.lineTotal.toFixed(6)),
      position: index,
    };
  });
}

/** Recomputes header totals from the stored lines. The lines are always the truth. */
export async function recalcInvoiceTotals(tx: Tx, invoiceId: string) {
  const lines = await tx.invoiceLine.findMany({ where: { invoiceId } });
  const totals = computeDocumentTotals(
    lines.map((l) => ({
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      discountPercent: l.discountPercent,
      tvaRate: l.tvaRate,
      lineSubtotal: l.lineSubtotal,
      lineTva: l.lineTva,
    }))
  );

  await tx.invoice.update({
    where: { id: invoiceId },
    data: {
      subtotal: new Prisma.Decimal(totals.subtotal.toFixed(6)),
      tvaAmount: new Prisma.Decimal(totals.tvaAmount.toFixed(6)),
      total: new Prisma.Decimal(totals.total.toFixed(6)),
      amountDue: new Prisma.Decimal(totals.total.toFixed(6)),
      taxBreakdown: totals.breakdown as never,
    },
  });

  return totals;
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function getInvoices() {
  const tenantId = await getTenantId();
  const rows = await withTenant(tenantId, (tx) =>
    tx.invoice.findMany({
      where: { tenantId },
      include: { company: true, tenant: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    })
  );
  return serialize(rows);
}

export async function getInvoice(invoiceId: string) {
  const tenantId = await getTenantId();
  const row = await withTenant(tenantId, (tx) =>
    tx.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: {
        company: true,
        tenant: true,
        lines: { orderBy: { position: "asc" }, include: { product: true } },
        allocations: { include: { payment: true } },
        submissions: { orderBy: { createdAt: "desc" }, take: 5 },
      },
    })
  );
  return serialize(row);
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export async function createInvoice(input: CreateInvoiceInput) {
  const tenantId = await getTenantId();
  assertLines(input.lines);

  return withTenant(tenantId, async (tx) => {
    const company = await tx.company.findFirst({
      where: { id: input.companyId, tenantId },
      select: { id: true, defaultPaymentTermsDays: true },
    });
    if (!company) throw domainError("NOT_FOUND", "Client introuvable");

    const date = input.date ?? new Date();
    const dueDate =
      input.dueDate ??
      new Date(date.getTime() + (company.defaultPaymentTermsDays ?? 30) * 86_400_000);

    const invoice = await tx.invoice.create({
      data: {
        tenantId,
        // Draft invoices carry a provisional identifier. The legal number is only
        // burned at posting time, so an abandoned draft never leaves a gap (I4).
        number: `BROUILLON-${Date.now().toString(36).toUpperCase()}`,
        companyId: input.companyId,
        salesOrderId: input.salesOrderId ?? null,
        devisId: input.devisId ?? null,
        deliveryNoteId: input.deliveryNoteId ?? null,
        date,
        dueDate,
        notes: input.notes ?? null,
        status: "Draft",
        lines: { create: buildLineData(input.lines, tenantId) },
      },
    });

    await recalcInvoiceTotals(tx, invoice.id);
    await audit(tx, {
      tenantId,
      entityType: "Invoice",
      entityId: invoice.id,
      action: "CREATE",
    });

    return serialize(
      await tx.invoice.findUniqueOrThrow({
        where: { id: invoice.id },
        include: { lines: true },
      })
    );
  });
}

/** Replaces the lines of a DRAFT invoice. Refuses anything else. */
export async function updateDraftInvoice(
  invoiceId: string,
  input: { companyId?: string; date?: Date; dueDate?: Date; notes?: string; lines?: InvoiceLineInput[] }
) {
  const tenantId = await getTenantId();

  return withTenant(tenantId, async (tx) => {
    const invoice = await tx.invoice.findFirst({ where: { id: invoiceId, tenantId } });
    if (!invoice) throw domainError("NOT_FOUND", "Facture introuvable");
    if (!EDITABLE_STATES.includes(invoice.status)) {
      throw domainError(
        "DOCUMENT_IMMUTABLE",
        `Une facture ${invoice.status} ne peut plus être modifiée. Établissez un avoir.`,
        { status: invoice.status }
      );
    }

    if (input.lines) {
      assertLines(input.lines);
      await tx.invoiceLine.deleteMany({ where: { invoiceId } });
      await tx.invoiceLine.createMany({
        data: buildLineData(input.lines, tenantId).map((l) => ({ ...l, invoiceId })),
      });
    }

    // Only an explicit allow-list of header fields is writable, ever. The previous
    // implementation forwarded an untyped object straight to the ORM.
    await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        ...(input.companyId ? { companyId: input.companyId } : {}),
        ...(input.date ? { date: input.date } : {}),
        ...(input.dueDate ? { dueDate: input.dueDate } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      },
    });

    await recalcInvoiceTotals(tx, invoiceId);
    await audit(tx, { tenantId, entityType: "Invoice", entityId: invoiceId, action: "UPDATE" });

    return serialize(
      await tx.invoice.findUniqueOrThrow({ where: { id: invoiceId }, include: { lines: true } })
    );
  });
}

/**
 * The one and only path by which an invoice becomes real.
 *
 * Order matters: validate, burn the number, write the ledger, then hand to clearance.
 * The GL entry and the number live or die with this transaction.
 */
export async function postInvoice(
  invoiceId: string,
  options: { userId?: string | null; allowSoftClosed?: boolean } = {}
) {
  const tenantId = await getTenantId();

  const result = await withTenant(tenantId, async (tx) => {
    const invoice = await tx.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: { lines: true, company: true },
    });
    if (!invoice) throw domainError("NOT_FOUND", "Facture introuvable");
    if (POSTED_STATES.includes(invoice.status)) {
      throw domainError("INVALID_STATE_TRANSITION", "Facture déjà comptabilisée", {
        status: invoice.status,
      });
    }
    if (invoice.lines.length === 0) {
      throw domainError("VALIDATION_FAILED", "Facture sans ligne");
    }

    const totals = computeDocumentTotals(
      invoice.lines.map((l) => ({
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        discountPercent: l.discountPercent,
        tvaRate: l.tvaRate,
        lineSubtotal: l.lineSubtotal,
        lineTva: l.lineTva,
      }))
    );
    assertTotalsConsistent(`Facture ${invoice.number}`, invoice, totals);

    // Credit control, before anything is burned.
    const creditLimit = dec(invoice.company.creditLimit);
    if (creditLimit.greaterThan(0)) {
      const outstanding = await tx.invoice.aggregate({
        where: { tenantId, companyId: invoice.companyId, status: { in: POSTED_STATES } },
        _sum: { amountDue: true },
      });
      const exposure = dec(outstanding._sum.amountDue ?? 0).plus(totals.total);
      if (exposure.greaterThan(creditLimit)) {
        throw domainError(
          "CREDIT_LIMIT_EXCEEDED",
          `Encours client ${exposure.toFixed(2)} supérieur à la limite ${creditLimit.toFixed(2)}`,
          { exposure: exposure.toFixed(2), limit: creditLimit.toFixed(2) }
        );
      }
    }

    const number = await nextNumber(tx, tenantId, "Invoice", invoice.date.getFullYear());

    const entry = await postEntry(tx, {
      tenantId,
      date: invoice.date,
      description: `Facture client ${number}`,
      journalCode: "VTE",
      sourceType: "Invoice",
      sourceId: invoice.id,
      userId: options.userId,
      allowSoftClosed: options.allowSoftClosed,
      lines: [
        {
          accountCode: "3421",
          companyId: invoice.companyId,
          debit: totals.total,
          description: `Créance client — ${number}`,
        },
        { accountCode: "7111", credit: totals.subtotal, description: `Vente — ${number}` },
        ...(totals.tvaAmount.isZero()
          ? []
          : [{ accountCode: "4455", credit: totals.tvaAmount, description: `TVA facturée — ${number}` }]),
      ],
    });

    const posted = await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        number,
        status: "Posted",
        postedAt: new Date(),
        journalEntryId: entry.id,
        subtotal: new Prisma.Decimal(totals.subtotal.toFixed(6)),
        tvaAmount: new Prisma.Decimal(totals.tvaAmount.toFixed(6)),
        total: new Prisma.Decimal(totals.total.toFixed(6)),
        amountDue: new Prisma.Decimal(totals.total.toFixed(6)),
        taxBreakdown: totals.breakdown as never,
      },
    });

    // Keep the originating order in step.
    if (invoice.salesOrderId) {
      await tx.salesOrder.update({
        where: { id: invoice.salesOrderId },
        data: { status: "Invoiced" },
      });
    }

    await audit(tx, {
      tenantId,
      userId: options.userId,
      entityType: "Invoice",
      entityId: invoice.id,
      action: "POST",
      diff: { number, total: totals.total.toFixed(2), journalEntryId: entry.id },
    });

    return posted;
  });

  // Clearance talks to an external platform: deliberately outside the ledger
  // transaction so a slow or failing DGI cannot roll back a valid accounting entry.
  await submitInvoiceForClearance(tenantId, invoiceId).catch(() => undefined);

  return serialize(result);
}

/**
 * Cancels a posted invoice the only legal way: a full credit note plus a ledger
 * reversal. Draft invoices are simply deleted.
 */
export async function cancelInvoice(invoiceId: string, reason: string) {
  const tenantId = await getTenantId();
  if (!reason?.trim()) {
    throw domainError("VALIDATION_FAILED", "Un motif est obligatoire pour annuler une facture");
  }

  return withTenant(tenantId, async (tx) => {
    const invoice = await tx.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: { lines: true },
    });
    if (!invoice) throw domainError("NOT_FOUND", "Facture introuvable");

    if (invoice.status === "Draft" || invoice.status === "Rejected") {
      await tx.invoiceLine.deleteMany({ where: { invoiceId } });
      await tx.invoice.delete({ where: { id: invoiceId } });
      await audit(tx, {
        tenantId,
        entityType: "Invoice",
        entityId: invoiceId,
        action: "DELETE",
        reason,
      });
      return { cancelled: true, creditNoteId: null };
    }

    if (dec(invoice.amountPaid).greaterThan(0)) {
      throw domainError(
        "INVALID_STATE_TRANSITION",
        "Facture déjà réglée: établissez un avoir et remboursez le client"
      );
    }

    const number = await nextNumber(tx, tenantId, "CreditNote", new Date().getFullYear());

    const creditNote = await tx.creditNote.create({
      data: {
        tenantId,
        number,
        invoiceId: invoice.id,
        companyId: invoice.companyId,
        date: new Date(),
        status: "Posted",
        reason,
        subtotal: invoice.subtotal,
        tvaAmount: invoice.tvaAmount,
        total: invoice.total,
        postedAt: new Date(),
        lines: {
          create: invoice.lines.map((l, index) => ({
            tenantId,
            productId: l.productId,
            description: l.description,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            tvaRate: l.tvaRate,
            discountPercent: l.discountPercent,
            lineSubtotal: l.lineSubtotal,
            lineTva: l.lineTva,
            lineTotal: l.lineTotal,
            position: index,
          })),
        },
      },
    });

    if (invoice.journalEntryId) {
      const reversal = await reverseEntry(tx, tenantId, invoice.journalEntryId, {
        reason: `Avoir ${number} — ${reason}`,
      });
      await tx.creditNote.update({
        where: { id: creditNote.id },
        data: { journalEntryId: reversal.id },
      });
    }

    await tx.invoice.update({
      where: { id: invoice.id },
      data: { status: "Cancelled", amountDue: new Prisma.Decimal(0) },
    });

    await audit(tx, {
      tenantId,
      entityType: "Invoice",
      entityId: invoice.id,
      action: "CANCEL",
      reason,
      diff: { creditNoteId: creditNote.id, creditNoteNumber: number },
    });

    return { cancelled: true, creditNoteId: creditNote.id };
  });
}

// ---------------------------------------------------------------------------
// Conversions from upstream documents
// ---------------------------------------------------------------------------

export async function convertOrderToInvoice(orderId: string) {
  const tenantId = await getTenantId();

  return withTenant(tenantId, async (tx) => {
    const order = await tx.salesOrder.findFirst({
      where: { id: orderId, tenantId },
      include: { lines: true },
    });
    if (!order) throw domainError("NOT_FOUND", "Commande introuvable");
    if (order.status === "Cancelled") {
      throw domainError("INVALID_STATE_TRANSITION", "Commande annulée");
    }

    const existing = await tx.invoice.findFirst({
      where: { tenantId, salesOrderId: order.id, status: { not: "Cancelled" } },
    });
    if (existing) {
      throw domainError("DUPLICATE_DOCUMENT", "Une facture existe déjà pour cette commande", {
        invoiceId: existing.id,
      });
    }
    if (order.lines.length === 0) {
      throw domainError("VALIDATION_FAILED", "Commande sans ligne");
    }

    const invoice = await tx.invoice.create({
      data: {
        tenantId,
        number: `BROUILLON-${Date.now().toString(36).toUpperCase()}`,
        companyId: order.companyId,
        salesOrderId: order.id,
        date: new Date(),
        status: "Draft",
        lines: {
          create: order.lines.map((l, index) => ({
            tenantId,
            salesOrderLineId: l.id,
            productId: l.productId,
            description: l.description,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            tvaRate: l.tvaRate,
            discountPercent: l.discountPercent,
            lineSubtotal: l.lineSubtotal,
            lineTva: l.lineTva,
            lineTotal: l.lineTotal,
            position: index,
          })),
        },
      },
    });

    await recalcInvoiceTotals(tx, invoice.id);
    await audit(tx, {
      tenantId,
      entityType: "Invoice",
      entityId: invoice.id,
      action: "CREATE",
      diff: { fromSalesOrder: order.number },
    });

    return serialize(await tx.invoice.findUniqueOrThrow({ where: { id: invoice.id } }));
  });
}

export async function convertDevisToInvoice(devisId: string) {
  const tenantId = await getTenantId();

  return withTenant(tenantId, async (tx) => {
    const devis = await tx.devis.findFirst({
      where: { id: devisId, tenantId },
      include: { lines: true },
    });
    if (!devis) throw domainError("NOT_FOUND", "Devis introuvable");
    if (devis.status === "Converted") {
      throw domainError("INVALID_STATE_TRANSITION", "Devis déjà converti");
    }
    if (devis.lines.length === 0) {
      throw domainError("VALIDATION_FAILED", "Devis sans ligne");
    }

    const invoice = await tx.invoice.create({
      data: {
        tenantId,
        number: `BROUILLON-${Date.now().toString(36).toUpperCase()}`,
        companyId: devis.companyId,
        devisId: devis.id,
        date: new Date(),
        status: "Draft",
        lines: {
          create: devis.lines.map((l, index) => ({
            tenantId,
            productId: l.productId,
            description: l.description,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            tvaRate: l.tvaRate,
            discountPercent: l.discountPercent,
            lineSubtotal: l.lineSubtotal,
            lineTva: l.lineTva,
            lineTotal: l.lineTotal,
            position: index,
          })),
        },
      },
    });

    await recalcInvoiceTotals(tx, invoice.id);
    await tx.devis.update({ where: { id: devisId }, data: { status: "Converted" } });
    await audit(tx, {
      tenantId,
      entityType: "Invoice",
      entityId: invoice.id,
      action: "CREATE",
      diff: { fromDevis: devis.number },
    });

    return serialize(await tx.invoice.findUniqueOrThrow({ where: { id: invoice.id } }));
  });
}

/**
 * Kept for the existing UI button. Only the transition to a posted invoice is
 * meaningful, so it delegates to the single posting path rather than accepting a
 * free-form patch object.
 */
export async function updateInvoice(
  invoiceId: string,
  data: { status?: string; notes?: string; dueDate?: Date }
) {
  if (data.status === "Finalized" || data.status === "Posted") {
    return postInvoice(invoiceId);
  }
  if (data.status === "Cancelled") {
    return cancelInvoice(invoiceId, "Annulation depuis l'interface");
  }
  return updateDraftInvoice(invoiceId, { notes: data.notes, dueDate: data.dueDate });
}

/** Delivers the goods of an invoice's lines and books the cost of sales. */
export async function deliverInvoiceStock(invoiceId: string, warehouseId: string) {
  const tenantId = await getTenantId();

  return withTenant(tenantId, async (tx) => {
    const invoice = await tx.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: { lines: true },
    });
    if (!invoice) throw domainError("NOT_FOUND", "Facture introuvable");

    for (const line of invoice.lines) {
      if (!line.productId) continue;
      await applyMovement(tx, {
        tenantId,
        productId: line.productId,
        warehouseId,
        quantity: dec(line.quantity).negated(),
        reason: "SalesDelivery",
        sourceDocumentType: "Invoice",
        sourceDocumentId: invoice.id,
        date: invoice.date,
      });
    }

    return { delivered: true };
  });
}
