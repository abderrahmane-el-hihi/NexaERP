"use server";

import { withTenant, withPlatformBypass, type Tx } from "@/shared/db/prisma";
import { dec, serialize } from "@/shared/money";
import { domainError } from "@/shared/errors";
import { audit } from "@/modules/platform/services/audit.service";
import { buildUbl, UblValidationError, type UblInvoice } from "./ubl.service";
import { hashPayload, resolveClearancePort } from "./clearance.port";
import { explainReject } from "./clearance.messages";

/**
 * DGI clearance (blueprint §9.2).
 *
 * Under a clearance model an invoice is not legally an invoice until the platform
 * validates it. That makes invoicing a distributed transaction with a government
 * system that will be slow, degraded or unavailable — so this module is mostly
 * queueing, retrying and explaining failures, not XML generation.
 *
 * Numbering rule: the number is reserved at posting and REUSED across attempts. A
 * rejected invoice was never legally issued, so its number must not be skipped.
 */

const BACKOFF_MINUTES = [1, 5, 15, 60, 360];

async function buildPayload(tx: Tx, tenantId: string, invoiceId: string) {
  const invoice = await tx.invoice.findFirst({
    where: { id: invoiceId, tenantId },
    include: {
      company: true,
      tenant: true,
      lines: { orderBy: { position: "asc" } },
    },
  });
  if (!invoice) throw domainError("NOT_FOUND", "Facture introuvable");

  const breakdown = (invoice.taxBreakdown as Array<{ rate: number; base: number; amount: number }> | null) ?? [];

  const ubl: UblInvoice = {
    number: invoice.number,
    issueDate: invoice.date,
    dueDate: invoice.dueDate,
    currency: invoice.tenant.defaultCurrency,
    supplier: {
      name: invoice.tenant.legalName ?? invoice.tenant.name,
      ice: invoice.tenant.ICE,
      taxId: invoice.tenant.IF,
      rc: invoice.tenant.RC,
      address: invoice.tenant.address,
      city: invoice.tenant.city,
      country: "MA",
    },
    customer: {
      name: invoice.company.name,
      ice: invoice.company.ICE,
      taxId: invoice.company.IF,
      rc: invoice.company.RC,
      address: invoice.company.address,
      city: invoice.company.city,
      country: invoice.company.country,
    },
    lines: invoice.lines.map((l, i) => ({
      position: i + 1,
      description: l.description,
      quantity: dec(l.quantity).toFixed(3),
      unitCode: "PCE",
      unitPrice: dec(l.unitPrice).toFixed(2),
      lineExtensionAmount: dec(l.lineSubtotal).toFixed(2),
      taxPercent: dec(l.tvaRate).toFixed(2),
      taxAmount: dec(l.lineTva).toFixed(2),
    })),
    taxSubtotals: breakdown.map((b) => ({
      taxableAmount: dec(b.base).toFixed(2),
      taxAmount: dec(b.amount).toFixed(2),
      percent: dec(b.rate).toFixed(2),
    })),
    lineExtensionAmount: dec(invoice.subtotal).toFixed(2),
    taxExclusiveAmount: dec(invoice.subtotal).toFixed(2),
    taxInclusiveAmount: dec(invoice.total).toFixed(2),
    payableAmount: dec(invoice.total).toFixed(2),
  };

  return { invoice, xml: buildUbl(ubl) };
}

/**
 * Queues an invoice for clearance and attempts a first submission.
 * Never throws into the posting path: a clearance problem must be visible and
 * retryable, not a reason to lose a valid accounting entry.
 */
export async function submitInvoiceForClearance(tenantId: string, invoiceId: string) {
  const enabled = process.env.EINVOICE_ENABLED === "true";

  const prepared = await withTenant(tenantId, async (tx) => {
    const invoice = await tx.invoice.findFirst({ where: { id: invoiceId, tenantId } });
    if (!invoice) throw domainError("NOT_FOUND", "Facture introuvable");
    if (!enabled) {
      await tx.invoice.update({
        where: { id: invoiceId },
        data: { dgiSubmissionStatus: "NotApplicable" },
      });
      return null;
    }

    let xml: string;
    try {
      xml = (await buildPayload(tx, tenantId, invoiceId)).xml;
    } catch (e) {
      if (e instanceof UblValidationError) {
        await tx.invoice.update({
          where: { id: invoiceId },
          data: {
            dgiSubmissionStatus: "Rejected",
            status: "Rejected",
          },
        });
        await tx.eInvoiceSubmission.create({
          data: {
            tenantId,
            invoiceId,
            attempt: 1,
            reservedNumber: invoice.number,
            payload: "",
            payloadHash: "",
            state: "Rejected",
            provider: "LOCAL_VALIDATION",
            rejectCodes: [{ code: "LOCAL_VALIDATION", field: e.field, message: e.message }] as never,
            idempotencyKey: `${invoiceId}:local:${Date.now()}`,
          },
        });
        await audit(tx, {
          tenantId,
          entityType: "Invoice",
          entityId: invoiceId,
          action: "CLEARANCE_RESULT",
          diff: { state: "Rejected", field: e.field, message: e.message },
        });
        return null;
      }
      throw e;
    }

    const attempt =
      (await tx.eInvoiceSubmission.count({ where: { tenantId, invoiceId } })) + 1;

    const submission = await tx.eInvoiceSubmission.create({
      data: {
        tenantId,
        invoiceId,
        attempt,
        // The reserved number is stable across attempts: a rejected invoice was never
        // legally issued, so it must be corrected and resubmitted under the same number.
        reservedNumber: invoice.number,
        payload: xml,
        payloadHash: hashPayload(xml),
        state: "Queued",
        provider: resolveClearancePort().name,
        idempotencyKey: `${invoiceId}:${attempt}`,
      },
    });

    await tx.invoice.update({
      where: { id: invoiceId },
      data: { ublXml: xml, dgiSubmissionStatus: "Pending", dgiSubmittedAt: new Date() },
    });

    await audit(tx, {
      tenantId,
      entityType: "Invoice",
      entityId: invoiceId,
      action: "CLEARANCE_SUBMIT",
      diff: { attempt, submissionId: submission.id },
    });

    return { submissionId: submission.id, xml, invoiceNumber: invoice.number };
  });

  if (!prepared) return null;

  return processSubmission(tenantId, prepared.submissionId);
}

/** Sends one queued submission and records the outcome. Safe to call repeatedly. */
export async function processSubmission(tenantId: string, submissionId: string) {
  const port = resolveClearancePort();

  const submission = await withTenant(tenantId, (tx) =>
    tx.eInvoiceSubmission.findFirst({ where: { id: submissionId, tenantId } })
  );
  if (!submission || submission.state !== "Queued") return null;

  let result;
  try {
    result = await port.submit(submission.payload, {
      invoiceNumber: submission.reservedNumber,
      tenantId,
    });
  } catch (e) {
    result = {
      state: "Pending" as const,
      transportError: e instanceof Error ? e.message : "transport failure",
    };
  }

  return withTenant(tenantId, async (tx) => {
    if (result.transportError) {
      const delay = BACKOFF_MINUTES[Math.min(submission.attempt - 1, BACKOFF_MINUTES.length - 1)];
      await tx.eInvoiceSubmission.update({
        where: { id: submissionId },
        data: {
          state: "Queued",
          nextAttemptAt: new Date(Date.now() + delay * 60_000),
          rejectCodes: [{ code: "TRANSPORT", message: result.transportError }] as never,
        },
      });
      return { state: "Pending" as const };
    }

    if (result.state === "Cleared") {
      await tx.eInvoiceSubmission.update({
        where: { id: submissionId },
        data: {
          state: "Cleared",
          providerSubmissionId: result.providerSubmissionId ?? null,
          clearanceReference: result.clearanceReference ?? null,
          clearedAt: new Date(),
          nextAttemptAt: null,
        },
      });
      await tx.invoice.update({
        where: { id: submission.invoiceId },
        data: {
          dgiSubmissionStatus: "Cleared",
          dgiClearanceId: result.clearanceReference ?? null,
          dgiClearedAt: new Date(),
        },
      });
      await audit(tx, {
        tenantId,
        entityType: "Invoice",
        entityId: submission.invoiceId,
        action: "CLEARANCE_RESULT",
        diff: { state: "Cleared", reference: result.clearanceReference },
      });
      return { state: "Cleared" as const, reference: result.clearanceReference };
    }

    const rejects = (result.rejects ?? []).map((r) => ({
      ...r,
      explanation: explainReject(r),
    }));

    await tx.eInvoiceSubmission.update({
      where: { id: submissionId },
      data: {
        state: "Rejected",
        providerSubmissionId: result.providerSubmissionId ?? null,
        rejectCodes: rejects as never,
        nextAttemptAt: null,
      },
    });
    await tx.invoice.update({
      where: { id: submission.invoiceId },
      data: { dgiSubmissionStatus: "Rejected", status: "Rejected" },
    });
    await audit(tx, {
      tenantId,
      entityType: "Invoice",
      entityId: submission.invoiceId,
      action: "CLEARANCE_RESULT",
      diff: { state: "Rejected", rejects },
    });

    return { state: "Rejected" as const, rejects };
  });
}

/** Retries every queued submission whose backoff has elapsed. Runs as a job. */
export async function runClearanceQueue(limit = 50) {
  const due = await withPlatformBypass((tx) =>
    tx.eInvoiceSubmission.findMany({
      where: {
        state: "Queued",
        OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: new Date() } }],
      },
      select: { id: true, tenantId: true },
      take: limit,
    })
  );

  const results = [];
  for (const row of due) {
    results.push(await processSubmission(row.tenantId, row.id));
  }
  return { processed: due.length, results };
}

/**
 * Month-end verification: did every posted invoice of the period actually clear?
 * This is the operational promise — a silently unfiled invoice discovered by the tax
 * authority months later is the worst failure this product can have.
 */
export async function verifyPeriodCleared(tenantId: string, from: Date, to: Date) {
  return withTenant(tenantId, async (tx) => {
    const invoices = await tx.invoice.findMany({
      where: {
        tenantId,
        status: { in: ["Posted", "Paid"] },
        date: { gte: from, lte: to },
        dgiSubmissionStatus: { not: "NotApplicable" },
      },
      select: {
        id: true,
        number: true,
        date: true,
        total: true,
        dgiSubmissionStatus: true,
      },
      orderBy: { date: "asc" },
    });

    const notCleared = invoices.filter((i) => i.dgiSubmissionStatus !== "Cleared");

    return serialize({
      total: invoices.length,
      cleared: invoices.length - notCleared.length,
      notCleared,
      ok: notCleared.length === 0,
    });
  });
}

/** Certificates that are about to expire stop a company from invoicing at all. */
export async function expiringCertificates(tenantId: string, withinDays = 60) {
  const limit = new Date(Date.now() + withinDays * 86_400_000);
  return withTenant(tenantId, (tx) =>
    tx.eInvoiceCertificate.findMany({
      where: { tenantId, state: { in: ["Active", "Expiring"] }, notAfter: { lte: limit } },
      orderBy: { notAfter: "asc" },
    })
  );
}
