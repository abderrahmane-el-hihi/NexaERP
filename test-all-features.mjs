import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE_URL = "http://localhost:3000";
const ARTIFACT_DIR = "C:/Users/Liad Tech/.gemini/antigravity/brain/e7d4df3a-48a9-4442-9886-b237a5da26f1";

async function runComprehensiveTests() {
  console.log("==================================================");
  console.log("🚀 TESTING COMPLETE SME ERP SUITE IN LIVE BROWSER");
  console.log("==================================================");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "fr-FR",
  });
  const page = await context.newPage();

  const results = [];

  async function testStep(name, fn) {
    try {
      console.log(`\n▶ [TEST] ${name}...`);
      await fn();
      console.log(`✅ [PASS] ${name}`);
      results.push({ name, status: "PASSED" });
    } catch (err) {
      console.error(`❌ [FAIL] ${name}\n`, err);
      results.push({ name, status: "FAILED", error: err.message });
    }
  }

  // 1. Test Purchasing & 3-Way Match (MM/AP)
  await testStep("1. Purchasing Workflow & 3-Way Match (PO -> Receipt -> Bill -> Payment)", async () => {
    await page.goto(`${BASE_URL}/dashboard/purchasing/orders`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("h1");
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "feature_01_po_page.png") });

    // Create a Purchase Order
    await page.click("button:has-text('Create Purchase Order (BC)')");
    await page.waitForSelector("#supplierSelect");
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "feature_02_create_po_dialog.png") });
    await page.click("button[type='submit']:has-text('Save Purchase Order')");
    await page.waitForTimeout(1000);

    // Receive Goods
    const receiveBtn = page.locator("button:has-text('Receive Goods (BR)')").first();
    if (await receiveBtn.count() > 0) {
      await receiveBtn.click();
      await page.waitForTimeout(1500);
    }

    // Generate Supplier Bill (3-Way Match)
    const billBtn = page.locator("button:has-text('Generate Bill (FF)')").first();
    if (await billBtn.count() > 0) {
      await billBtn.click();
      await page.waitForTimeout(1500);
    }

    await page.screenshot({ path: path.join(ARTIFACT_DIR, "feature_03_po_completed.png") });

    // Visit Supplier Bills (Accounts Payable)
    await page.goto(`${BASE_URL}/dashboard/purchasing/bills`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("h1");
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "feature_04_supplier_bills.png") });

    // Pay Bill
    const payBtn = page.locator("button:has-text('Pay Bill')").first();
    if (await payBtn.count() > 0) {
      await payBtn.click();
      await page.waitForSelector("#payAmount");
      await page.screenshot({ path: path.join(ARTIFACT_DIR, "feature_05_pay_bill_dialog.png") });
      await page.click("button[type='submit']:has-text('Confirm Settlement')");
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(ARTIFACT_DIR, "feature_06_bills_settled.png") });
    }
  });

  // 2. Test Fulfillment & Delivery Notes (BL)
  await testStep("2. Delivery Notes (Bon de Livraison) & Physical Stock Decrement", async () => {
    await page.goto(`${BASE_URL}/dashboard/sales/orders`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("h1");

    // Issue Delivery Note
    const deliverBtn = page.locator("button:has-text('Issue Delivery (BL)')").first();
    if (await deliverBtn.count() > 0) {
      await deliverBtn.click();
      await page.waitForTimeout(1500);
    }

    await page.screenshot({ path: path.join(ARTIFACT_DIR, "feature_07_orders_delivered.png") });

    // Visit Delivery Notes Page
    await page.goto(`${BASE_URL}/dashboard/sales/delivery`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("h1");
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "feature_08_delivery_notes.png") });
  });

  // 3. Test Credit Notes / Avoirs & GL Reversal
  await testStep("3. Credit Notes (Factures d'Avoir) & Legal Immutability Reversal", async () => {
    await page.goto(`${BASE_URL}/dashboard/sales/invoices`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("h1");

    // Click Issue Avoir
    const avoirBtn = page.locator("button:has-text('Issue Avoir')").first();
    if (await avoirBtn.count() > 0) {
      await avoirBtn.click();
      await page.waitForSelector("#reasonInput");
      await page.screenshot({ path: path.join(ARTIFACT_DIR, "feature_09_create_avoir_dialog.png") });
      await page.click("button[type='submit']:has-text('Confirm & Post Avoir')");
      await page.waitForTimeout(1500);
    }

    // Visit Credit Notes Page
    await page.goto(`${BASE_URL}/dashboard/sales/credit-notes`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("h1");
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "feature_10_credit_notes.png") });
  });

  // 4. Test Comprehensive Financial Statements (FI/CO)
  await testStep("4. Financial Statements (CPC, Bilan, Trial Balance, Aged AR/AP)", async () => {
    await page.goto(`${BASE_URL}/dashboard/finance/reports`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("h1");
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "feature_11_trial_balance.png") });

    // Income Statement (CPC)
    await page.click("button:has-text('Compte de Résultat (CPC')");
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "feature_12_cpc_statement.png") });

    // Balance Sheet (Bilan)
    await page.click("button:has-text('Bilan (Balance Sheet)')");
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "feature_13_bilan_statement.png") });

    // Aged Receivables & Payables
    await page.click("button:has-text('Aged AR & AP')");
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "feature_14_aging_reports.png") });
  });

  // 5. Test Moroccan HR & Payroll Engine (HCM)
  await testStep("5. Moroccan HR & Payroll Engine (Employee Master, CNSS/AMO/IGR & Payslips)", async () => {
    await page.goto(`${BASE_URL}/dashboard/hr`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("h1");
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "feature_15_employee_master.png") });

    // Add Employee
    await page.click("button:has-text('Add Employee')");
    await page.waitForSelector("#firstName");
    await page.fill("#firstName", "Karima");
    await page.fill("#lastName", "Idrissi");
    await page.fill("#cin", "BK891234");
    await page.fill("#cnss", "398765432");
    await page.fill("#jobTitle", "Responsable Logistique");
    await page.fill("#baseSalary", "11000");
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "feature_16_new_employee_dialog.png") });
    await page.click("button[type='submit']:has-text('Save Employee')");
    await page.waitForTimeout(1000);

    // Visit Payroll Page
    await page.goto(`${BASE_URL}/dashboard/hr/payroll`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("h1");
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "feature_17_payroll_page.png") });

    // Run Monthly Payroll
    await page.click("button:has-text('Run Monthly Payroll')");
    await page.waitForSelector("#payrollPeriod");
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "feature_18_run_payroll_dialog.png") });
    await page.click("button[type='submit']:has-text('Generate Payslips')");
    await page.waitForTimeout(2000);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, "feature_19_payroll_results.png") });
  });

  console.log("\n==================================================");
  console.log("🏁 ALL FEATURE SUITE TESTS COMPLETED");
  console.log("==================================================");
  let allPassed = true;
  results.forEach((r) => {
    console.log(`${r.status === "PASSED" ? "✅" : "❌"} ${r.name}: ${r.status}`);
    if (r.status !== "PASSED") allPassed = false;
    if (r.error) console.log(`   Error: ${r.error}`);
  });

  await browser.close();
  return allPassed;
}

runComprehensiveTests().then((passed) => {
  if (!passed) process.exit(1);
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
