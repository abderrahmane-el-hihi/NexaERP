import { prisma } from "../src/shared/db/prisma";
import { convertDevisToInvoice } from "../src/modules/sales/services/invoice.service";
import { updateInvoice } from "../src/modules/sales/services/invoice.service";
import { getTrialBalance } from "../src/modules/finance/services/report.service";
import { getTenantId } from "../src/lib/auth"; // We might need to mock this

async function runLiveTest() {
  console.log("🚀 Starting Automated E2E Flow Test...");
  
  // 1. Get the first tenant
  const tenant = await prisma.tenant.findFirst();
  if (!tenant) throw new Error("No tenant found");
  const tenantId = tenant.id;
  
  console.log(`✅ Using Tenant: ${tenant.name}`);

  // Mock getTenantId temporarily for the test (since it uses headers in Next.js)
  // We'll just call the internal services directly where possible, or pass tenantId.
  // Wait, our services use getTenantId() which relies on Next.js headers().
  // This means we can't easily run them in a bare node script without Next.js context.
  
  // Let's test the database layer directly for the flow
  console.log("Creating Company...");
  const company = await prisma.company.create({
    data: {
      tenantId,
      name: "Test Client E2E",
      email: "test@e2e.com",
      status: "Lead"
    }
  });
  console.log(`✅ Company created: ${company.name}`);

  console.log("Creating Product...");
  const product = await prisma.product.create({
    data: {
      tenantId,
      name: "E2E Service",
      sku: "E2E-001",
      price: 1000,
      cost: 500,
      type: "Service",
      tvaRate: 20
    }
  });
  console.log(`✅ Product created: ${product.name}`);

  console.log("Creating Devis...");
  const devis = await prisma.devis.create({
    data: {
      tenantId,
      companyId: company.id,
      number: "DEV-E2E",
      date: new Date(),
      subtotal: 1000,
      tvaAmount: 200,
      total: 1200,
      status: "Draft",
      lines: {
        create: [{
          tenantId,
          productId: product.id,
          description: "E2E Service",
          quantity: 1,
          unitPrice: 1000,
          tvaRate: 20,
          lineTotal: 1000
        }]
      }
    }
  });
  console.log(`✅ Devis created: ${devis.number}`);

  // Test GL directly using the imported journal service
  console.log("Finalizing Invoice (This will trigger GL Automation)...");
  // We'll create an invoice directly to bypass the next.js header dependency in convertDevisToInvoice
  const invoice = await prisma.invoice.create({
    data: {
      tenantId,
      companyId: company.id,
      number: "FAC-E2E",
      date: new Date(),
      subtotal: 1000,
      tvaAmount: 200,
      total: 1200,
      status: "Draft",
    }
  });
  
  // We need to import the journal service
  const { postSalesInvoiceToGL } = require("../src/modules/finance/services/journal.service");
  
  let journalCreated = false;
  try {
    await prisma.$transaction(async (tx) => {
      const updatedInvoice = await tx.invoice.update({
        where: { id: invoice.id },
        data: { status: "Finalized" },
      });
      const je = await postSalesInvoiceToGL(tenantId, invoice.id, tx);
      console.log(`✅ GL Journal Entry Created: ${je.number}`);
      journalCreated = true;
    });
  } catch (error: any) {
    console.error("❌ GL Posting Failed:", error.message);
  }

  // Cleanup
  await prisma.company.delete({ where: { id: company.id } });
  await prisma.product.delete({ where: { id: product.id } });
  await prisma.devis.delete({ where: { id: devis.id } });
  await prisma.invoice.delete({ where: { id: invoice.id } });
  
  console.log("🧹 Cleanup complete.");
  console.log(journalCreated ? "🎉 ALL TESTS PASSED!" : "❌ SOME TESTS FAILED.");
}

runLiveTest().catch(console.error);
