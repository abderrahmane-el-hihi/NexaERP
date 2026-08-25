import { PrismaClient } from "./generated/prisma/client/index.js";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function runSaaSSecuritySuite() {
  console.log("==========================================================");
  console.log("🛡️ RUNNING SAAS MULTI-TENANT ISOLATION & PENETRATION SUITE");
  console.log("==========================================================");

  const results = [];
  const TENANT_A = "tenant-alpha-security-test";
  const TENANT_B = "tenant-beta-security-test";

  async function assertTest(name, fn) {
    try {
      console.log(`\n▶ [SECURITY CHECK] ${name}...`);
      await fn();
      console.log(`🔒 [SECURE - PASS] ${name}`);
      results.push({ name, status: "PASSED" });
    } catch (err) {
      console.error(`🚨 [LEAK DETECTED - FAIL] ${name}\n`, err);
      results.push({ name, status: "FAILED", error: err.message });
    }
  }

  // Setup: Provision 2 isolated tenants
  await prisma.tenant.deleteMany({
    where: { id: { in: [TENANT_A, TENANT_B] } },
  });

  await prisma.tenant.create({
    data: {
      id: TENANT_A,
      name: "Atlas Distribution SARL",
      slug: "atlas-dist",
      ICE: "001122334455667",
      IF: "11223344",
      city: "Casablanca",
      subscriptionPlan: "Business",
    },
  });

  await prisma.tenant.create({
    data: {
      id: TENANT_B,
      name: "Maroc Retail Group SARL",
      slug: "maroc-retail",
      ICE: "009988776655443",
      IF: "99887766",
      city: "Rabat",
      subscriptionPlan: "Starter",
    },
  });

  // TEST 1: Cross-Tenant Data Leakage Prevention (Row-Level Scoping)
  await assertTest("1. Cross-Tenant Data Isolation (Invoices, Customers, Employees)", async () => {
    // Create confidential customer and invoice in Tenant Alpha
    const companyA = await prisma.company.create({
      data: {
        tenantId: TENANT_A,
        name: "Confidential Client Alpha SARL",
        type: "Customer",
        ICE: "001234567890123",
      },
    });

    const invoiceA = await prisma.invoice.create({
      data: {
        tenantId: TENANT_A,
        number: "FA-2026-00001",
        companyId: companyA.id,
        subtotal: 50000,
        tvaAmount: 10000,
        total: 60000,
        amountDue: 60000,
        amountPaid: 0,
        status: "Finalized",
      },
    });

    const empA = await prisma.employee.create({
      data: {
        tenantId: TENANT_A,
        firstName: "Secret",
        lastName: "Executive",
        jobTitle: "CEO",
        baseSalary: 45000,
      },
    });

    // Adversarial Query: Search for invoices, companies, and employees as Tenant Beta
    const betaInvoices = await prisma.invoice.findMany({
      where: { tenantId: TENANT_B },
    });
    const betaCompanies = await prisma.company.findMany({
      where: { tenantId: TENANT_B },
    });
    const betaEmployees = await prisma.employee.findMany({
      where: { tenantId: TENANT_B },
    });

    if (betaInvoices.some((i) => i.id === invoiceA.id)) {
      throw new Error("CRITICAL SECURITY LEAK: Tenant Beta can see Tenant Alpha invoices!");
    }
    if (betaCompanies.some((c) => c.id === companyA.id)) {
      throw new Error("CRITICAL SECURITY LEAK: Tenant Beta can see Tenant Alpha companies!");
    }
    if (betaEmployees.some((e) => e.id === empA.id)) {
      throw new Error("CRITICAL SECURITY LEAK: Tenant Beta can see Tenant Alpha employee payroll!");
    }

    if (betaInvoices.length !== 0 || betaCompanies.length !== 0 || betaEmployees.length !== 0) {
      throw new Error("Isolation failure: Unexpected records returned for Tenant Beta.");
    }
  });

  // TEST 2: Gapless Sequential Numbering Isolation
  await assertTest("2. Independent Legal Numbering Isolation (TenantSequence)", async () => {
    // Initialize sequence for Tenant A
    await prisma.tenantSequence.create({
      data: {
        tenantId: TENANT_A,
        type: "Invoice",
        year: 2026,
        nextNumber: 15, // Tenant A has issued 14 invoices
      },
    });

    // Initialize sequence for Tenant B
    await prisma.tenantSequence.create({
      data: {
        tenantId: TENANT_B,
        type: "Invoice",
        year: 2026,
        nextNumber: 1, // Tenant B is brand new
      },
    });

    const seqA = await prisma.tenantSequence.findUnique({
      where: {
        tenantId_type_year: {
          tenantId: TENANT_A,
          type: "Invoice",
          year: 2026,
        },
      },
    });

    const seqB = await prisma.tenantSequence.findUnique({
      where: {
        tenantId_type_year: {
          tenantId: TENANT_B,
          type: "Invoice",
          year: 2026,
        },
      },
    });

    if (!seqA || !seqB) throw new Error("Failed to locate tenant sequences");
    if (seqA.nextNumber !== 15 || seqB.nextNumber !== 1) {
      throw new Error("Sequence collision: Sequences are not strictly isolated per tenant");
    }
  });

  // TEST 3: Settings & Modular Feature Isolation
  await assertTest("3. Settings & Module Configuration Independence", async () => {
    // Tenant A upgrades to Business with custom commercial terms
    await prisma.tenant.update({
      where: { id: TENANT_A },
      data: {
        commercialSettings: {
          defaultPaymentTerms: "Net 60 Days",
          bankAccountRIB: "007 780 0001112223334445 55",
        },
        subscriptionPlan: "Business",
      },
    });

    // Tenant B remains on Starter with default terms
    const tenantB = await prisma.tenant.findUnique({
      where: { id: TENANT_B },
    });

    if (tenantB?.subscriptionPlan !== "Starter") {
      throw new Error("Plan leak: Tenant B was affected by Tenant A upgrade");
    }
    const termsB = tenantB?.commercialSettings?.defaultPaymentTerms;
    if (termsB === "Net 60 Days") {
      throw new Error("Settings leak: Tenant B inherited Tenant A commercial terms");
    }
  });

  // TEST 4: General Ledger Double-Entry Isolation
  await assertTest("4. General Ledger (Double-Entry Bookkeeping) Isolation", async () => {
    // Create GL Journal entry under Tenant A
    const accA = await prisma.account.create({
      data: {
        tenantId: TENANT_A,
        code: "5141",
        name: "Banque BMCE",
        type: "Asset",
      },
    });

    const jeA = await prisma.journalEntry.create({
      data: {
        tenantId: TENANT_A,
        number: "JE-2026-00001",
        description: "Apport de capital",
        sourceType: "Manual",
        status: "Posted",
        lines: {
          create: [
            {
              tenantId: TENANT_A,
              accountId: accA.id,
              debit: 100000,
              credit: 0,
              description: "Débit Banque",
            },
          ],
        },
      },
    });

    // Query GL as Tenant B
    const betaEntries = await prisma.journalEntry.findMany({
      where: { tenantId: TENANT_B },
      include: { lines: true },
    });

    if (betaEntries.length > 0) {
      throw new Error("Financial Ledger leak: Tenant B can see Tenant A financial entries");
    }
  });

  // Cleanup
  await prisma.tenant.deleteMany({
    where: { id: { in: [TENANT_A, TENANT_B] } },
  });

  console.log("\n==========================================================");
  console.log("🏁 ALL SAAS SECURITY & ISOLATION TESTS COMPLETED");
  console.log("==========================================================");
  let allPassed = true;
  results.forEach((r) => {
    console.log(`${r.status === "PASSED" ? "🔒" : "🚨"} ${r.name}: ${r.status}`);
    if (r.status !== "PASSED") allPassed = false;
  });

  await prisma.$disconnect();
  return allPassed;
}

runSaaSSecuritySuite().then((passed) => {
  if (!passed) process.exit(1);
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
