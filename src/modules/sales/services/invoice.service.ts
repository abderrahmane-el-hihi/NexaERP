"use server";

import { prisma } from "@/shared/db/prisma";
import { getNextSequenceNumber } from "./sequence.service";
import { getTenantId } from "@/lib/auth";
import { postSalesInvoiceToGL } from "@/modules/finance/services/journal.service";

export async function getInvoices() {
  const tenantId = await getTenantId();
  return await prisma.invoice.findMany({
    where: { tenantId },
    include: { company: true, tenant: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function convertOrderToInvoice(orderId: string) {
  const tenantId = await getTenantId();
  return await prisma.$transaction(async (tx) => {
    const order = await tx.salesOrder.findUnique({
      where: { id: orderId, tenantId },
    });

    if (!order) throw new Error("Order not found");
    
    // Check if invoice already exists
    const existing = await tx.invoice.findFirst({
      where: { tenantId, salesOrderId: order.id }
    });
    if (existing) throw new Error("Invoice already exists for this order");

    const year = new Date().getFullYear();
    const invoiceNumber = await getNextSequenceNumber(tenantId, "Invoice", year);

    const invoice = await tx.invoice.create({
      data: {
        tenantId,
        number: invoiceNumber,
        companyId: order.companyId,
        salesOrderId: order.id,
        subtotal: order.subtotal,
        tvaAmount: order.tvaAmount,
        total: order.total,
        amountDue: order.total,
        amountPaid: 0,
        status: "Finalized", // Or "Draft" depending on flow, let's use Finalized for immutability demo
      },
    });

    return invoice;
  });
}

export async function convertDevisToInvoice(devisId: string) {
  const tenantId = await getTenantId();
  return await prisma.$transaction(async (tx) => {
    const devis = await tx.devis.findUnique({
      where: { id: devisId, tenantId },
    });

    if (!devis) throw new Error("Devis not found");
    if (devis.status === "Converted") throw new Error("Devis is already converted");

    const year = new Date().getFullYear();
    const invoiceNumber = await getNextSequenceNumber(tenantId, "Invoice", year);

    const invoice = await tx.invoice.create({
      data: {
        tenantId,
        number: invoiceNumber,
        companyId: devis.companyId,
        subtotal: devis.subtotal,
        tvaAmount: devis.tvaAmount,
        total: devis.total,
        amountDue: devis.total,
        amountPaid: 0,
        status: "Draft",
      },
    });

    await tx.devis.update({
      where: { id: devisId },
      data: { status: "Converted" },
    });

    return invoice;
  });
}

// Example of enforcing immutability
export async function updateInvoice(invoiceId: string, data: any) {
  const tenantId = await getTenantId();
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId, tenantId },
  });

  if (!invoice) throw new Error("Invoice not found");
  
  // Immutability Check
  if (["Finalized", "Sent", "Paid", "Overdue"].includes(invoice.status)) {
    // Only allow specific updates like recording a payment
    if (Object.keys(data).some(key => !["amountPaid", "amountDue", "status"].includes(key))) {
       throw new Error("Cannot modify a finalized invoice. Create a credit note instead.");
    }
  }

  // If finalizing the invoice, wrap in transaction to post to GL
  if (data.status === "Finalized" && invoice.status !== "Finalized") {
    return await prisma.$transaction(async (tx) => {
      const updatedInvoice = await tx.invoice.update({
        where: { id: invoiceId },
        data,
      });
      await postSalesInvoiceToGL(tenantId, invoiceId, tx);
      return updatedInvoice;
    });
  }

  return await prisma.invoice.update({
    where: { id: invoiceId },
    data,
  });
}
