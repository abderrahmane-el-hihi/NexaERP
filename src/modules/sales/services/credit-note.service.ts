"use server";

import { Prisma } from "@/generated/prisma/client";
import { withTenant } from "@/shared/db/prisma";
import { getTenantId } from "@/lib/auth";
import { dec, serialize, sum } from "@/shared/money";
import { domainError } from "@/shared/errors";
import { nextNumber } from "@/modules/platform/services/sequence.service";
import { audit } from "@/modules/platform/services/audit.service";
import { postEntry } from "@/modules/finance/services/posting.service";
import { computeDocumentTotals } from "@/modules/finance/services/tax.service";
import { applyMovement } from "@/modules/inv/services/stock-ledger.service";

/**
 * Credit notes (avoirs) — the only legal way to correct a posted invoice.
 *
 * A partial credit is supported by passing the quantities to credit. Returned goods
 * re-enter stock through the stock ledger so they are valued at cost rather than
 * silently appearing.
 */

export async function getCreditNotes() {
  const tenantId = await getTenantId();
  const rows = await withTenant(tenantId, (tx) =>
    tx.creditNote.findMany({
      where: { tenantId },
      include: { company: true, invoice: true, lines: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    })
  );
  return serialize(rows);
}

export interface CreditNoteInput {
  invoiceId: string;
  reason: string;
  restockGoods?: boolean;
  warehouseId?: string;
  /** Optional partial credit: invoice line id -> quantity to credit. Defaults to all. */
  quantities?: Record<string, number | string>;
}

export async function createCreditNoteFromInvoice(data: CreditNoteInput) {
  const tenantId = await getTenantId();
  if (!data.reason?.trim()) {
    throw domainError("VALIDATION_FAILED", "Un motif est obligatoire pour établir un avoir");
  }

  return withTenant(tenantId, async (tx) => {
    const invoice = await tx.invoice.findFirst({
      where: { id: data.invoiceId, tenantId },
      include: { company: true, lines: { orderBy: { position: "asc" } } },
    });
    if (!invoice) throw domainError("NOT_FOUND", "Facture introuvable");
    if (!["Posted", "Paid"].includes(invoice.status)) {
      throw domainError(
        "INVALID_STATE_TRANSITION",
        "Seule une facture comptabilisée peut faire l'objet d'un avoir"
      );
    }

    // Never credit more than what remains uncredited on each line.
    const previous = await tx.creditNoteLine.findMany({
      where: { creditNote: { invoiceId: invoice.id, status: "Posted" } },
      select: { productId: true, description: true, quantity: true },
    });
    const alreadyCredited = new Map<string, ReturnType<typeof dec>>();
    for (const p of previous) {
      const key = `${p.productId ?? ""}|${p.description}`;
      alreadyCredited.set(key, (alreadyCredited.get(key) ?? dec(0)).plus(dec(p.quantity)));
    }

    const creditLines = invoice.lines
      .map((line, index) => {
        const key = `${line.productId ?? ""}|${line.description}`;
        const credited = alreadyCredited.get(key) ?? dec(0);
        const invoiced = dec(line.quantity);
        const requested =
          data.quantities?.[line.id] !== undefined
            ? dec(data.quantities[line.id])
            : invoiced.minus(credited);
        const creditable = invoiced.minus(credited);

        if (requested.greaterThan(creditable)) {
          throw domainError(
            "OVER_ALLOCATION",
            `Quantité à créditer (${requested.toFixed(3)}) supérieure au restant sur "${line.description}" (${creditable.toFixed(3)})`
          );
        }
        return { line, quantity: requested, index };
      })
      .filter((x) => x.quantity.greaterThan(0));

    if (creditLines.length === 0) {
      throw domainError("VALIDATION_FAILED", "Rien à créditer sur cette facture");
    }

    const totals = computeDocumentTotals(
      creditLines.map(({ line, quantity }) => ({
        quantity,
        unitPrice: line.unitPrice,
        discountPercent: line.discountPercent,
        tvaRate: line.tvaRate,
      }))
    );

    const number = await nextNumber(tx, tenantId, "CreditNote");

    const creditNote = await tx.creditNote.create({
      data: {
        tenantId,
        number,
        invoiceId: invoice.id,
        companyId: invoice.companyId,
        reason: data.reason,
        restock: data.restockGoods ?? false,
        status: "Posted",
        postedAt: new Date(),
        subtotal: new Prisma.Decimal(totals.subtotal.toFixed(6)),
        tvaAmount: new Prisma.Decimal(totals.tvaAmount.toFixed(6)),
        total: new Prisma.Decimal(totals.total.toFixed(6)),
        lines: {
          create: creditLines.map(({ line, quantity }, position) => {
            const lineSubtotal = quantity
              .times(dec(line.unitPrice))
              .times(dec(100).minus(dec(line.discountPercent)))
              .dividedBy(100);
            const lineTva = lineSubtotal.times(dec(line.tvaRate)).dividedBy(100);
            return {
              tenantId,
              productId: line.productId,
              description: line.description,
              quantity: new Prisma.Decimal(quantity.toFixed(6)),
              unitPrice: line.unitPrice,
              tvaRate: line.tvaRate,
              discountPercent: line.discountPercent,
              lineSubtotal: new Prisma.Decimal(lineSubtotal.toFixed(6)),
              lineTva: new Prisma.Decimal(lineTva.toFixed(6)),
              lineTotal: new Prisma.Decimal(lineSubtotal.plus(lineTva).toFixed(6)),
              position,
            };
          }),
        },
      },
    });

    // Mirror image of the sales posting: revenue and VAT down, receivable down.
    const entry = await postEntry(tx, {
      tenantId,
      date: new Date(),
      description: `Avoir ${number} sur facture ${invoice.number} — ${invoice.company.name}`,
      journalCode: "VTE",
      sourceType: "CreditNote",
      sourceId: creditNote.id,
      lines: [
        { accountCode: "7111", debit: totals.subtotal, description: `Annulation vente HT — ${number}` },
        ...(totals.tvaAmount.isZero()
          ? []
          : [{ accountCode: "4455", debit: totals.tvaAmount, description: `Régularisation TVA — ${number}` }]),
        {
          accountCode: "3421",
          companyId: invoice.companyId,
          credit: totals.total,
          description: `Annulation créance — ${invoice.company.name}`,
        },
      ],
    });

    await tx.creditNote.update({
      where: { id: creditNote.id },
      data: { journalEntryId: entry.id },
    });

    // The credit reduces what the customer still owes.
    const newDue = dec(invoice.amountDue).minus(totals.total);
    await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        amountDue: new Prisma.Decimal((newDue.isNegative() ? dec(0) : newDue).toFixed(6)),
        status: newDue.lessThanOrEqualTo(0) ? "Paid" : invoice.status,
      },
    });

    if (data.restockGoods) {
      const warehouse = data.warehouseId
        ? await tx.warehouse.findFirst({ where: { id: data.warehouseId, tenantId } })
        : await tx.warehouse.findFirst({ where: { tenantId }, orderBy: { isDefault: "desc" } });

      if (warehouse) {
        for (const { line, quantity } of creditLines) {
          if (!line.productId) continue;
          await applyMovement(tx, {
            tenantId,
            productId: line.productId,
            warehouseId: warehouse.id,
            quantity,
            reason: "CustomerReturn",
            // Returned goods come back at what they cost us, not at today's cost.
            unitCost: await originalCostOf(tx, tenantId, invoice.id, line.productId),
            sourceDocumentType: "CreditNote",
            sourceDocumentId: creditNote.id,
            note: `Retour sur avoir ${number} (facture ${invoice.number})`,
          });
        }
      }
    }

    await audit(tx, {
      tenantId,
      entityType: "CreditNote",
      entityId: creditNote.id,
      action: "POST",
      reason: data.reason,
      diff: { number, invoice: invoice.number, total: totals.total.toFixed(2) },
    });

    return serialize(await tx.creditNote.findUniqueOrThrow({ where: { id: creditNote.id } }));
  });
}

/** Cost at which the goods originally left, so a return does not distort margin history. */
async function originalCostOf(
  tx: Parameters<Parameters<typeof withTenant>[1]>[0],
  tenantId: string,
  invoiceId: string,
  productId: string
) {
  const outgoing = await tx.stockMovement.findFirst({
    where: {
      tenantId,
      productId,
      reason: "SalesDelivery",
      OR: [
        { sourceDocumentType: "Invoice", sourceDocumentId: invoiceId },
        { sourceDocumentType: "DeliveryNote" },
      ],
    },
    orderBy: { date: "desc" },
    select: { unitCost: true },
  });
  return outgoing?.unitCost ?? undefined;
}

/** Sum of credit notes issued against an invoice. */
export async function creditedAmount(invoiceId: string) {
  const tenantId = await getTenantId();
  const rows = await withTenant(tenantId, (tx) =>
    tx.creditNote.findMany({
      where: { tenantId, invoiceId, status: "Posted" },
      select: { total: true },
    })
  );
  return sum(rows.map((r) => r.total)).toNumber();
}
