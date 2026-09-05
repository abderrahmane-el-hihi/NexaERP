"use server";

import { Prisma } from "@/generated/prisma/client";
import { withTenant, type Tx } from "@/shared/db/prisma";
import { getTenantId } from "@/lib/auth";
import { dec, serialize } from "@/shared/money";
import { domainError } from "@/shared/errors";
import { nextNumber } from "@/modules/platform/services/sequence.service";
import { audit } from "@/modules/platform/services/audit.service";
import { computeDocumentTotals, computeLine } from "@/modules/finance/services/tax.service";

export interface DevisLineInput {
  productId?: string;
  description?: string;
  quantity: number | string;
  unitPrice: number | string;
  tvaRate?: number | string;
  discount?: number | string;
  discountPercent?: number | string;
}

export interface DevisHeaderInput {
  companyId: string;
  contactId?: string | null;
  opportunityId?: string | null;
  date?: Date;
  validUntil?: Date;
  notes?: string;
}

export async function getDevis() {
  const tenantId = await getTenantId();
  const rows = await withTenant(tenantId, (tx) =>
    tx.devis.findMany({
      where: { tenantId },
      include: { company: true, lines: true, tenant: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    })
  );
  return serialize(rows);
}

async function recalcDevisTotals(tx: Tx, devisId: string) {
  const lines = await tx.devisLine.findMany({ where: { devisId } });
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
  await tx.devis.update({
    where: { id: devisId },
    data: {
      subtotal: new Prisma.Decimal(totals.subtotal.toFixed(6)),
      tvaAmount: new Prisma.Decimal(totals.tvaAmount.toFixed(6)),
      total: new Prisma.Decimal(totals.total.toFixed(6)),
    },
  });
  return totals;
}

/**
 * Creates a quotation.
 *
 * The previous implementation silently invented a product called "Standard Item" when
 * a line had no product, which quietly polluted the catalogue of every tenant that
 * used the quick form. A line without a product is now a plain description line.
 */
export async function createDevis(header: DevisHeaderInput, lines: DevisLineInput[]) {
  const tenantId = await getTenantId();

  if (!lines?.length) {
    throw domainError("VALIDATION_FAILED", "Un devis doit comporter au moins une ligne");
  }
  if (!header?.companyId) {
    throw domainError("VALIDATION_FAILED", "Client obligatoire");
  }

  return withTenant(tenantId, async (tx) => {
    const company = await tx.company.findFirst({ where: { id: header.companyId, tenantId } });
    if (!company) throw domainError("NOT_FOUND", "Client introuvable");

    // A quotation is not a legal document, so it takes its number immediately.
    const number = await nextNumber(tx, tenantId, "Devis");

    const productIds = lines.map((l) => l.productId).filter(Boolean) as string[];
    const products = productIds.length
      ? await tx.product.findMany({
          where: { tenantId, id: { in: productIds } },
          select: { id: true },
        })
      : [];
    const known = new Set(products.map((p) => p.id));

    const devis = await tx.devis.create({
      data: {
        tenantId,
        number,
        companyId: header.companyId,
        contactId: header.contactId ?? null,
        opportunityId: header.opportunityId ?? null,
        date: header.date ?? new Date(),
        validUntil: header.validUntil ?? null,
        notes: header.notes ?? null,
        status: "Draft",
        lines: {
          create: lines.map((line, index) => {
            const discount = line.discountPercent ?? line.discount ?? 0;
            const computed = computeLine({
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              discountPercent: discount,
              tvaRate: line.tvaRate ?? 20,
            });
            const productId =
              line.productId && known.has(line.productId) ? line.productId : null;
            if (!productId) {
              throw domainError(
                "VALIDATION_FAILED",
                `Produit introuvable pour la ligne "${line.description ?? index + 1}"`
              );
            }
            return {
              tenantId,
              productId,
              description: line.description || "Article",
              quantity: new Prisma.Decimal(dec(line.quantity).toFixed(6)),
              unitPrice: new Prisma.Decimal(dec(line.unitPrice).toFixed(6)),
              tvaRate: new Prisma.Decimal(dec(line.tvaRate ?? 20).toFixed(6)),
              discountPercent: new Prisma.Decimal(dec(discount).toFixed(6)),
              lineSubtotal: new Prisma.Decimal(computed.lineSubtotal.toFixed(6)),
              lineTva: new Prisma.Decimal(computed.lineTva.toFixed(6)),
              lineTotal: new Prisma.Decimal(computed.lineTotal.toFixed(6)),
              position: index,
            };
          }),
        },
      },
    });

    await recalcDevisTotals(tx, devis.id);
    await audit(tx, { tenantId, entityType: "Devis", entityId: devis.id, action: "CREATE" });

    return serialize(await tx.devis.findUniqueOrThrow({ where: { id: devis.id } }));
  });
}
