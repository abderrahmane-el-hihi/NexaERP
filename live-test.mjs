import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE_URL = "http://localhost:3000";
const ARTIFACT_DIR = "C:/Users/Liad Tech/.gemini/antigravity/brain/e7d4df3a-48a9-4442-9886-b237a5da26f1";

if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

async function runLiveTest() {
  console.log("==================================================");
  console.log("🌐 STARTING LIVE BROWSER TESTING SESSION");
  console.log("==================================================");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "fr-FR",
  });
  const page = await context.newPage();

  // 1. Onboarding
  console.log("📸 Capturing: Onboarding...");
  await page.goto(`${BASE_URL}/onboarding`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "live_01_onboarding.png") });

  // 2. Dashboard
  console.log("📸 Capturing: Dashboard Overview...");
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle" });
  await page.waitForSelector("h1");
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "live_02_dashboard.png") });

  // 3. CRM - Companies
  console.log("📸 Capturing: CRM Companies...");
  await page.goto(`${BASE_URL}/dashboard/crm/companies`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "live_03_companies.png") });

  // 4. CRM - Contacts
  console.log("📸 Capturing: CRM Contacts...");
  await page.goto(`${BASE_URL}/dashboard/crm/contacts`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "live_04_contacts.png") });

  // 5. CRM - Pipeline Kanban
  console.log("📸 Capturing: CRM Sales Pipeline...");
  await page.goto(`${BASE_URL}/dashboard/crm`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "live_05_pipeline.png") });

  // 6. Catalog
  console.log("📸 Capturing: Product Catalog...");
  await page.goto(`${BASE_URL}/dashboard/catalog`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "live_06_catalog.png") });

  // 7. Sales - Devis
  console.log("📸 Capturing: Sales Devis (Quotes)...");
  await page.goto(`${BASE_URL}/dashboard/sales/devis`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "live_07_devis.png") });

  // 8. Sales - New Devis
  console.log("📸 Capturing: New Devis Authoring...");
  await page.goto(`${BASE_URL}/dashboard/sales/devis/new`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "live_08_new_devis.png") });

  // 9. Sales - Orders
  console.log("📸 Capturing: Sales Orders...");
  await page.goto(`${BASE_URL}/dashboard/sales/orders`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "live_09_orders.png") });

  // 10. Sales - Invoices
  console.log("📸 Capturing: Invoices & Finalization...");
  await page.goto(`${BASE_URL}/dashboard/sales/invoices`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "live_10_invoices.png") });

  // 11. Purchasing Orders
  console.log("📸 Capturing: Purchasing (MM-PUR)...");
  await page.goto(`${BASE_URL}/dashboard/purchasing/orders`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "live_11_purchasing.png") });

  // 12. Inventory
  console.log("📸 Capturing: Inventory & Warehouses (INV)...");
  await page.goto(`${BASE_URL}/dashboard/inventory`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "live_12_inventory.png") });

  // 13. Finance - Trial Balance
  console.log("📸 Capturing: Finance Reports & Trial Balance (FICO)...");
  await page.goto(`${BASE_URL}/dashboard/finance/reports`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "live_13_finance_reports.png") });

  // 14. Finance - General Ledger
  console.log("📸 Capturing: General Ledger...");
  await page.goto(`${BASE_URL}/dashboard/finance/ledger`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "live_14_finance_ledger.png") });

  console.log("==================================================");
  console.log("✨ ALL LIVE SCREENSHOTS CAPTURED SUCCESSFULLY!");
  console.log("==================================================");

  await browser.close();
}

runLiveTest().catch((err) => {
  console.error("Live test error:", err);
  process.exit(1);
});
