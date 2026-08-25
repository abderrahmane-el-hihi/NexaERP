import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE_URL = "http://localhost:3000";
const ARTIFACT_DIR = "C:/Users/Liad Tech/.gemini/antigravity/brain/e7d4df3a-48a9-4442-9886-b237a5da26f1";

async function runSaaSBrowserTests() {
  console.log("==========================================================");
  console.log("🚀 TESTING SAAS CAPABILITIES IN LIVE BROWSER");
  console.log("==========================================================");

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

  // 1. Test Multi-Tenant Workspace Switcher in Header
  await testStep("1. Header Multi-Tenant Workspace Switcher", async () => {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("header");
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "saas_01_header_switcher.png") });

    // Open Switcher dropdown
    const switcher = page.locator("header button[role='combobox']").first();
    if (await switcher.count() > 0) {
      await switcher.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(ARTIFACT_DIR, "saas_02_switcher_dropdown.png") });
      // Click outside or close
      await page.keyboard.press("Escape");
    }
  });

  // 2. Test Subscription Plans & Upgrades Tab in Settings
  await testStep("2. SaaS Subscription Tiers & Plan Management", async () => {
    await page.goto(`${BASE_URL}/dashboard/settings`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("h1");

    // Click Subscription & Plans tab
    await page.click("button:has-text('Subscription & Plans')");
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "saas_03_subscription_tab.png") });

    // Switch Plan to Growth (PME)
    const switchBtn = page.locator("button:has-text('Switch to Growth (PME)')").first();
    if (await switchBtn.count() > 0) {
      await switchBtn.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(ARTIFACT_DIR, "saas_04_plan_switched_growth.png") });
    }
  });

  // 3. Test Self-Service Products CSV Importer
  await testStep("3. Self-Service Products CSV Data Importer", async () => {
    await page.goto(`${BASE_URL}/dashboard/catalog`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("h1");

    // Open CSV Dialog
    await page.click("button:has-text('Import CSV')");
    await page.waitForSelector("#csvData");
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "saas_05_import_products_dialog.png") });

    // Run Bulk Import
    await page.click("button[type='submit']:has-text('Run Bulk Import')");
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "saas_06_products_imported_success.png") });

    await page.click("button:has-text('Close')");
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "saas_07_catalog_updated.png") });
  });

  // 4. Test Self-Service Moroccan Companies CSV Importer
  await testStep("4. Self-Service Companies & ICE CSV Importer", async () => {
    await page.goto(`${BASE_URL}/dashboard/crm/companies`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("h1");

    // Open CSV Dialog
    await page.click("button:has-text('Import CSV')");
    await page.waitForSelector("#csvData");
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "saas_08_import_companies_dialog.png") });

    // Run Bulk Import
    await page.click("button[type='submit']:has-text('Run Bulk Import')");
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "saas_09_companies_imported_success.png") });

    await page.click("button:has-text('Close')");
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "saas_10_companies_updated.png") });
  });

  console.log("\n==========================================================");
  console.log("🏁 ALL SAAS BROWSER TESTS COMPLETED");
  console.log("==========================================================");
  let allPassed = true;
  results.forEach((r) => {
    console.log(`${r.status === "PASSED" ? "✅" : "❌"} ${r.name}: ${r.status}`);
    if (r.status !== "PASSED") allPassed = false;
  });

  await browser.close();
  return allPassed;
}

runSaaSBrowserTests().then((passed) => {
  if (!passed) process.exit(1);
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
