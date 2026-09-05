import { describe, it, expect, beforeEach, vi } from "vitest";
import { withTenant } from "@/shared/db/prisma";
import { dec } from "@/shared/money";
import { createTestTenant, type TestTenant } from "./helpers/factory";

/**
 * End-to-end business flows against the real database.
 *
 * The services resolve the tenant from the signed-in session, so the auth module is
 * the one thing mocked here: everything below it — posting, numbering, stock, tax,
 * clearance — is the production code path.
 */

let current: TestTenant;

vi.mock("@/lib/auth", () => ({
  getTenantId: async () => current.tenantId,
  getCurrentUser: async () => ({ id: current.userId }),
  getUserTenants: async () => ({ activeTenantId: current.tenantId, tenants: [] }),
}));

const { createInvoice, postInvoice, cancelInvoice, getInvoice, deliverInvoiceStock } = await import(
  "@/modules/sales/services/invoice.service"
);
const { registerPayment, payInvoice } = await import("@/modules/finance/services/payment.service");
const { createCreditNoteFromInvoice } = await import("@/modules/sales/services/credit-note.service");
const { createPurchaseOrder, confirmPurchaseOrder, receiveGoodsFromPO, createSupplierBillFromPO } =
  await import("@/modules/purchasing/services/purchase-order.service");
const { getARAging, getTrialBalance } = await import(
  "@/modules/finance/services/financial-statements.service"
);
const { verifyPeriodCleared } = await import("@/modules/einvoice/services/clearance.service");

beforeEach(async () => {
  current = await createTestTenant();
});

async function accountBalance(tenantId: string, code: string) {
  return withTenant(tenantId, async (tx) => {
    const account = await tx.account.findFirstOrThrow({ where: { tenantId, code } });
    const agg = await tx.journalEntryLine.aggregate({
      where: { tenantId, accountId: account.id, journalEntry: { status: { in: ["Posted", "Reversed"] } } },
      _sum: { debit: true, credit: true },
    });
    return dec(agg._sum.debit ?? 0).minus(dec(agg._sum.credit ?? 0));
  });
}

describe("Order to cash", () => {
  it("invoices, posts to the ledger, and collects payment", async () => {
    const invoice = await createInvoice({
      companyId: current.companyId,
      lines: [
        { productId: current.productId, description: "Produit Test", quantity: 10, unitPrice: 100, tvaRate: 20 },
        { description: "Frais de livraison", quantity: 1, unitPrice: 200, tvaRate: 20 },
      ],
    });

    expect(invoice.subtotal).toBe(1200);
    expect(invoice.tvaAmount).toBe(240);
    expect(invoice.total).toBe(1440);
    expect(invoice.number).toMatch(/^BROUILLON-/);

    const posted = await postInvoice(invoice.id);

    expect(posted.status).toBe("Posted");
    expect(posted.number).toMatch(/^FA-\d{4}-00001$/);
    expect(posted.amountDue).toBe(1440);

    // The ledger says the same thing as the document.
    expect((await accountBalance(current.tenantId, "3421")).toFixed(2)).toBe("1440.00");
    expect((await accountBalance(current.tenantId, "7111")).toFixed(2)).toBe("-1200.00");
    expect((await accountBalance(current.tenantId, "4455")).toFixed(2)).toBe("-240.00");

    await payInvoice(posted.id, { amount: 1440, method: "virement" });

    const settled = await getInvoice(posted.id);
    expect(settled!.status).toBe("Paid");
    expect(settled!.amountDue).toBe(0);
    expect(settled!.amountPaid).toBe(1440);

    expect((await accountBalance(current.tenantId, "3421")).toFixed(2)).toBe("0.00");
    expect((await accountBalance(current.tenantId, "5141")).toFixed(2)).toBe("1440.00");
  });

  it("refuses to post the same invoice twice", async () => {
    const invoice = await createInvoice({
      companyId: current.companyId,
      lines: [{ description: "Service", quantity: 1, unitPrice: 500, tvaRate: 20 }],
    });
    await postInvoice(invoice.id);
    await expect(postInvoice(invoice.id)).rejects.toThrow(/déjà comptabilisée/i);
  });

  it("refuses to edit a posted invoice", async () => {
    const invoice = await createInvoice({
      companyId: current.companyId,
      lines: [{ description: "Service", quantity: 1, unitPrice: 500, tvaRate: 20 }],
    });
    const posted = await postInvoice(invoice.id);

    const { updateDraftInvoice } = await import("@/modules/sales/services/invoice.service");
    await expect(
      updateDraftInvoice(posted.id, { lines: [{ description: "Autre", quantity: 1, unitPrice: 1 }] })
    ).rejects.toThrow(/ne peut plus être modifiée/i);
  });

  it("cancels a posted invoice by reversal, never by deletion", async () => {
    const invoice = await createInvoice({
      companyId: current.companyId,
      lines: [{ description: "Service", quantity: 1, unitPrice: 1000, tvaRate: 20 }],
    });
    const posted = await postInvoice(invoice.id);

    const result = await cancelInvoice(posted.id, "Commande annulée par le client");
    expect(result.creditNoteId).toBeTruthy();

    // Receivable back to zero, and the original entry is still there, marked reversed.
    expect((await accountBalance(current.tenantId, "3421")).toFixed(2)).toBe("0.00");

    const entries = await withTenant(current.tenantId, (tx) =>
      tx.journalEntry.findMany({ where: { tenantId: current.tenantId, sourceType: "Invoice" } })
    );
    expect(entries.some((e) => e.status === "Reversed")).toBe(true);

    const still = await getInvoice(posted.id);
    expect(still).not.toBeNull();
    expect(still!.status).toBe("Cancelled");
  });

  it("books cost of sales when the goods leave", async () => {
    // Receive stock first so there is something to cost.
    const { applyMovement } = await import("@/modules/inv/services/stock-ledger.service");
    await withTenant(current.tenantId, (tx) =>
      applyMovement(tx, {
        tenantId: current.tenantId,
        productId: current.productId,
        warehouseId: current.warehouseId,
        quantity: 20,
        unitCost: "60",
        reason: "PurchaseReceipt",
      })
    );

    const invoice = await createInvoice({
      companyId: current.companyId,
      lines: [
        { productId: current.productId, description: "Produit Test", quantity: 5, unitPrice: 100, tvaRate: 20 },
      ],
    });
    await postInvoice(invoice.id);
    await deliverInvoiceStock(invoice.id, current.warehouseId);

    // 5 units at 60 leave stock and become an expense.
    expect((await accountBalance(current.tenantId, "6114")).toFixed(2)).toBe("300.00");
    expect((await accountBalance(current.tenantId, "3111")).toFixed(2)).toBe("900.00");
  });

  it("reports the receivable in the right ageing bucket", async () => {
    const invoice = await createInvoice({
      companyId: current.companyId,
      date: new Date(Date.now() - 90 * 86_400_000),
      dueDate: new Date(Date.now() - 45 * 86_400_000),
      lines: [{ description: "Ancienne facture", quantity: 1, unitPrice: 1000, tvaRate: 0 }],
    });
    await postInvoice(invoice.id);

    const ageing = await getARAging();
    expect(ageing.buckets.days31_60).toBe(1000);
    expect(ageing.buckets.current).toBe(0);
  });
});

describe("Payments and allocation", () => {
  it("settles several invoices with one payment", async () => {
    const first = await postInvoice(
      (await createInvoice({
        companyId: current.companyId,
        lines: [{ description: "A", quantity: 1, unitPrice: 300, tvaRate: 0 }],
      })).id
    );
    const second = await postInvoice(
      (await createInvoice({
        companyId: current.companyId,
        lines: [{ description: "B", quantity: 1, unitPrice: 700, tvaRate: 0 }],
      })).id
    );

    await registerPayment({
      companyId: current.companyId,
      amount: 1000,
      method: "virement",
      allocations: [
        { invoiceId: first.id, amount: 300 },
        { invoiceId: second.id, amount: 700 },
      ],
    });

    expect((await getInvoice(first.id))!.status).toBe("Paid");
    expect((await getInvoice(second.id))!.status).toBe("Paid");
    expect((await accountBalance(current.tenantId, "3421")).toFixed(2)).toBe("0.00");
  });

  it("supports a partial payment", async () => {
    const invoice = await postInvoice(
      (await createInvoice({
        companyId: current.companyId,
        lines: [{ description: "A", quantity: 1, unitPrice: 1000, tvaRate: 0 }],
      })).id
    );

    await payInvoice(invoice.id, { amount: 400, method: "cash" });

    const partial = await getInvoice(invoice.id);
    expect(partial!.status).toBe("Posted");
    expect(partial!.amountPaid).toBe(400);
    expect(partial!.amountDue).toBe(600);
  });

  it("refuses to allocate more than the invoice owes", async () => {
    const invoice = await postInvoice(
      (await createInvoice({
        companyId: current.companyId,
        lines: [{ description: "A", quantity: 1, unitPrice: 100, tvaRate: 0 }],
      })).id
    );

    await expect(payInvoice(invoice.id, { amount: 150, method: "cash" })).rejects.toThrow(
      /supérieure au solde/i
    );
  });

  it("reopens the invoice when a cheque bounces", async () => {
    const invoice = await postInvoice(
      (await createInvoice({
        companyId: current.companyId,
        lines: [{ description: "A", quantity: 1, unitPrice: 500, tvaRate: 0 }],
      })).id
    );
    const payment = await payInvoice(invoice.id, { amount: 500, method: "cheque" });
    expect((await getInvoice(invoice.id))!.status).toBe("Paid");

    const { markPaymentBounced } = await import("@/modules/finance/services/payment.service");
    await markPaymentBounced(payment.id, "Chèque sans provision");

    const reopened = await getInvoice(invoice.id);
    expect(reopened!.amountDue).toBe(500);
    expect((await accountBalance(current.tenantId, "5111")).toFixed(2)).toBe("0.00");
  });
});

describe("Credit notes", () => {
  it("credits part of an invoice and refuses to credit more than remains", async () => {
    const invoice = await postInvoice(
      (await createInvoice({
        companyId: current.companyId,
        lines: [
          { productId: current.productId, description: "Produit Test", quantity: 10, unitPrice: 100, tvaRate: 20 },
        ],
      })).id
    );

    const full = await getInvoice(invoice.id);
    const lineId = full!.lines[0].id;

    const creditNote = await createCreditNoteFromInvoice({
      invoiceId: invoice.id,
      reason: "Retour partiel",
      quantities: { [lineId]: 4 },
    });

    expect(creditNote.total).toBe(480); // 4 x 100 x 1.20
    expect(creditNote.number).toMatch(/^AV-\d{4}-00001$/);

    const afterCredit = await getInvoice(invoice.id);
    expect(afterCredit!.amountDue).toBe(720);

    // Only 6 units remain creditable.
    await expect(
      createCreditNoteFromInvoice({
        invoiceId: invoice.id,
        reason: "Trop",
        quantities: { [lineId]: 7 },
      })
    ).rejects.toThrow(/supérieure au restant/i);
  });

  it("puts returned goods back at the cost they left at", async () => {
    const { applyMovement } = await import("@/modules/inv/services/stock-ledger.service");
    await withTenant(current.tenantId, (tx) =>
      applyMovement(tx, {
        tenantId: current.tenantId,
        productId: current.productId,
        warehouseId: current.warehouseId,
        quantity: 10,
        unitCost: "60",
        reason: "PurchaseReceipt",
      })
    );

    const invoice = await postInvoice(
      (await createInvoice({
        companyId: current.companyId,
        lines: [
          { productId: current.productId, description: "Produit Test", quantity: 5, unitPrice: 100, tvaRate: 20 },
        ],
      })).id
    );
    await deliverInvoiceStock(invoice.id, current.warehouseId);

    await createCreditNoteFromInvoice({
      invoiceId: invoice.id,
      reason: "Retour",
      restockGoods: true,
      warehouseId: current.warehouseId,
    });

    const level = await withTenant(current.tenantId, (tx) =>
      tx.stockLevel.findUniqueOrThrow({
        where: {
          productId_warehouseId: {
            productId: current.productId,
            warehouseId: current.warehouseId,
          },
        },
      })
    );
    expect(dec(level.quantity).toFixed(0)).toBe("10");

    // Value is back to 10 units at 60.
    expect((await accountBalance(current.tenantId, "3111")).toFixed(2)).toBe("600.00");
  });
});

describe("Procure to pay", () => {
  it("runs order, receipt, bill and payment, and keeps 4417 clean", async () => {
    const po = await createPurchaseOrder({
      companyId: current.supplierId,
      lines: [
        { productId: current.productId, description: "Produit Test", quantity: 20, unitPrice: 60, tvaRate: 20 },
      ],
    });
    expect(po.total).toBe(1440);

    await confirmPurchaseOrder(po.id);
    await receiveGoodsFromPO(po.id, current.warehouseId);

    // Goods are in stock and we owe them, not yet invoiced.
    expect((await accountBalance(current.tenantId, "3111")).toFixed(2)).toBe("1200.00");
    expect((await accountBalance(current.tenantId, "4417")).toFixed(2)).toBe("-1200.00");

    const bill = await createSupplierBillFromPO(po.id, "FACT-FOURN-001");
    expect(bill.total).toBe(1440);

    // The bill clears the goods-received account and records the debt with VAT.
    expect((await accountBalance(current.tenantId, "4417")).toFixed(2)).toBe("0.00");
    expect((await accountBalance(current.tenantId, "3455")).toFixed(2)).toBe("240.00");
    expect((await accountBalance(current.tenantId, "4411")).toFixed(2)).toBe("-1440.00");

    const { paySupplierBill } = await import("@/modules/purchasing/services/purchase-order.service");
    await paySupplierBill({ billId: bill.id, amount: 1440, method: "virement" });

    expect((await accountBalance(current.tenantId, "4411")).toFixed(2)).toBe("0.00");
    expect((await accountBalance(current.tenantId, "5141")).toFixed(2)).toBe("-1440.00");
  });

  it("refuses a duplicate supplier invoice reference", async () => {
    const po = await createPurchaseOrder({
      companyId: current.supplierId,
      lines: [{ productId: current.productId, description: "P", quantity: 5, unitPrice: 60, tvaRate: 20 }],
    });
    await confirmPurchaseOrder(po.id);
    await receiveGoodsFromPO(po.id, current.warehouseId);
    await createSupplierBillFromPO(po.id, "DUP-001");

    const second = await createPurchaseOrder({
      companyId: current.supplierId,
      lines: [{ productId: current.productId, description: "P", quantity: 5, unitPrice: 60, tvaRate: 20 }],
    });
    await confirmPurchaseOrder(second.id);
    await receiveGoodsFromPO(second.id, current.warehouseId);

    await expect(createSupplierBillFromPO(second.id, "DUP-001")).rejects.toThrow(/déjà été enregistrée/i);
  });

  it("refuses to bill goods that were never received", async () => {
    const po = await createPurchaseOrder({
      companyId: current.supplierId,
      lines: [{ productId: current.productId, description: "P", quantity: 5, unitPrice: 60, tvaRate: 20 }],
    });
    await confirmPurchaseOrder(po.id);

    await expect(createSupplierBillFromPO(po.id, "NO-RECEIPT")).rejects.toThrow(/réceptionnez/i);
  });
});

describe("E-invoicing clearance", () => {
  it("clears a posted invoice and records the reference", async () => {
    const invoice = await postInvoice(
      (await createInvoice({
        companyId: current.companyId,
        lines: [{ description: "Prestation", quantity: 1, unitPrice: 1000, tvaRate: 20 }],
      })).id
    );

    const cleared = await getInvoice(invoice.id);
    expect(cleared!.dgiSubmissionStatus).toBe("Cleared");
    expect(cleared!.dgiClearanceId).toMatch(/^MA-/);
    expect(cleared!.ublXml).toContain("<cbc:UBLVersionID>2.1</cbc:UBLVersionID>");
    expect(cleared!.submissions[0].state).toBe("Cleared");
  });

  it("rejects locally when the customer has no ICE, and keeps the number for the retry", async () => {
    const noIce = await withTenant(current.tenantId, (tx) =>
      tx.company.create({
        data: { tenantId: current.tenantId, name: "Sans ICE", type: "customer" },
      })
    );

    const invoice = await postInvoice(
      (await createInvoice({
        companyId: noIce.id,
        lines: [{ description: "Prestation", quantity: 1, unitPrice: 500, tvaRate: 20 }],
      })).id
    );

    const rejected = await getInvoice(invoice.id);
    expect(rejected!.dgiSubmissionStatus).toBe("Rejected");
    expect(rejected!.status).toBe("Rejected");

    const submission = rejected!.submissions[0];
    // The reserved number is kept: a rejected invoice was never legally issued, so the
    // correction is resubmitted under the same number rather than skipping one.
    expect(submission.reservedNumber).toBe(rejected!.number);
    expect(JSON.stringify(submission.rejectCodes)).toContain("customer.ice");
  });

  it("verifies at period end that every invoice cleared", async () => {
    await postInvoice(
      (await createInvoice({
        companyId: current.companyId,
        lines: [{ description: "OK", quantity: 1, unitPrice: 100, tvaRate: 20 }],
      })).id
    );

    const from = new Date(Date.now() - 86_400_000);
    const to = new Date(Date.now() + 86_400_000);
    const report = await verifyPeriodCleared(current.tenantId, from, to);

    expect(report.total).toBe(1);
    expect(report.ok).toBe(true);
    expect(report.notCleared).toHaveLength(0);
  });
});

describe("Reporting", () => {
  it("produces a balanced trial balance after a full cycle", async () => {
    const po = await createPurchaseOrder({
      companyId: current.supplierId,
      lines: [{ productId: current.productId, description: "P", quantity: 10, unitPrice: 60, tvaRate: 20 }],
    });
    await confirmPurchaseOrder(po.id);
    await receiveGoodsFromPO(po.id, current.warehouseId);
    await createSupplierBillFromPO(po.id, "TB-001");

    const invoice = await postInvoice(
      (await createInvoice({
        companyId: current.companyId,
        lines: [
          { productId: current.productId, description: "Produit Test", quantity: 4, unitPrice: 100, tvaRate: 20 },
        ],
      })).id
    );
    await deliverInvoiceStock(invoice.id, current.warehouseId);
    await payInvoice(invoice.id, { amount: 480, method: "virement" });

    const tb = await getTrialBalance();
    expect(tb.balanced).toBe(true);
    expect(tb.totalDebit).toBeCloseTo(tb.totalCredit, 2);
  });
});
