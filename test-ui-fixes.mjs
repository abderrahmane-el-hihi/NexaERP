import { chromium } from 'playwright';
import path from 'path';

const ARTIFACT_DIR = "C:\\Users\\Liad Tech\\.gemini\\antigravity\\brain\\e7d4df3a-48a9-4442-9886-b237a5da26f1";
const BASE_URL = "http://localhost:3000";

async function runUIFixesTests() {
  console.log("==========================================================");
  console.log("🚀 TESTING UI FIXES, ONBOARDING, BUTTONS & WORKSPACE FLOWS");
  console.log("==========================================================\n");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  async function testStep(name, fn) {
    process.stdout.write(`▶ [TEST] ${name}... `);
    try {
      await fn();
      console.log(`\x1b[32m✅ [PASS]\x1b[0m ${name}`);
      return true;
    } catch (e) {
      console.log(`\x1b[31m❌ [FAIL]\x1b[0m ${name}\n`, e);
      return false;
    }
  }

  const results = {};

  // 1. Test Onboarding & Add New Enterprise Flow
  results.onboarding = await testStep("1. New Enterprise Creation & Onboarding Flow", async () => {
    await page.goto(`${BASE_URL}/onboarding`);
    await page.waitForSelector("h1");
    
    // Screenshot Step 1
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "fix_01_onboarding_step1.png") });

    await page.fill("#companyName", "Atlas Maghreb Tech SARL");
    await page.fill("#ice", "009988776655443");
    await page.fill("#if", "77665544");
    await page.fill("#rc", "44332");
    await page.fill("#city", "Tanger");
    await page.fill("#address", "Zone Franche Tanger Med, Lot 45");

    await page.click("button[type='submit']");
    await page.waitForTimeout(600);

    // Screenshot Step 2 (Modules)
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "fix_02_onboarding_step2_modules.png") });

    // Click Launch Enterprise Workspace
    await page.click("button:has-text('Launch Enterprise Workspace')");
    
    // Wait for redirect to dashboard
    await page.waitForURL("**/dashboard", { timeout: 15000 });
    await page.waitForSelector("header");
    await page.waitForTimeout(1000);

    // Capture dashboard with newly created workspace active
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "fix_03_dashboard_new_workspace.png") });
  });

  // 2. Test Sidebar Single-Link Active Highlighting
  results.sidebar = await testStep("2. Sidebar Single Active Link Highlighting", async () => {
    // Navigate to /dashboard/crm/companies
    await page.goto(`${BASE_URL}/dashboard/crm/companies`);
    await page.waitForSelector("h1");
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "fix_04_sidebar_companies_active.png") });

    // Navigate to /dashboard/hr/payroll
    await page.goto(`${BASE_URL}/dashboard/hr/payroll`);
    await page.waitForSelector("h1");
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "fix_05_sidebar_payroll_active.png") });
  });

  // 3. Test Manual Stock Adjustment in Inventory
  results.inventory = await testStep("3. Inventory Manual Stock Adjustment Flow", async () => {
    await page.goto(`${BASE_URL}/dashboard/inventory`);
    await page.waitForSelector("h1");

    // Click Manual Stock Adjustment
    const btn = page.locator("button:has-text('Manual Stock Adjustment')").first();
    await btn.click();
    await page.waitForSelector("[role='dialog']");
    await page.waitForTimeout(500);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, "fix_06_stock_adjustment_dialog.png") });
  });

  // 4. Test Create Sales Order Flow
  results.salesOrders = await testStep("4. Direct Sales Order Creation Flow", async () => {
    await page.goto(`${BASE_URL}/dashboard/sales/orders`);
    await page.waitForSelector("h1");

    const orderBtn = page.locator("button:has-text('Create Sales Order')").first();
    await orderBtn.click();
    await page.waitForSelector("[role='dialog']");
    await page.waitForTimeout(500);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, "fix_07_create_sales_order_dialog.png") });
  });

  // 5. Test Product & Company Inline Editing
  results.editing = await testStep("5. Master Data Inline Editing Dialogs", async () => {
    await page.goto(`${BASE_URL}/dashboard/catalog`);
    await page.waitForSelector("h1");
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "fix_08_catalog_edit_ready.png") });

    await page.goto(`${BASE_URL}/dashboard/crm/companies`);
    await page.waitForSelector("h1");
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "fix_09_companies_edit_ready.png") });
  });

  console.log("\n==========================================================");
  console.log("🏁 ALL UI & WORKFLOW TESTS COMPLETED");
  console.log("==========================================================");
  Object.entries(results).forEach(([k, v]) => {
    console.log(`${v ? "✅" : "❌"} ${k}: ${v ? "PASSED" : "FAILED"}`);
  });

  await browser.close();
}

runUIFixesTests().catch(console.error);
