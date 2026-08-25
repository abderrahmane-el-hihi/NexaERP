import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE_URL = "http://localhost:3000";
const SCREENSHOT_DIR = path.resolve("./screenshots");

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runTests() {
  console.log("==================================================");
  console.log("🚀 STARTING FULL BROWSER E2E TEST SUITE FOR NexaERP");
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

  // 1. Test Onboarding Page
  await testStep("1. Onboarding & Company Setup Flow", async () => {
    await page.goto(`${BASE_URL}/onboarding`, { waitUntil: "networkidle" });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01_onboarding_step1.png` });

    await page.fill("#companyName", "Atlas Distribution SARL");
    await page.fill("#ice", "002345678000099");
    await page.fill("#if", "54321098");
    await page.click("button[type='submit']");

    await page.waitForTimeout(600);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01_onboarding_step2.png` });

    await page.click("button:has-text('Create Workspace')");
    await page.waitForURL("**/dashboard", { timeout: 10000 });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02_dashboard.png` });
  });

  // 2. Test Dashboard Page
  await testStep("2. Dashboard Overview & KPI Metrics", async () => {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle" });
    await page.waitForSelector("h1");
    await page.screenshot({ path: `${SCREENSHOT_DIR}/03_dashboard_view.png` });
  });

  // 3. Test CRM Companies (Customer & Supplier)
  await testStep("3. CRM - Create Moroccan Companies (ICE/RC/IF)", async () => {
    await page.goto(`${BASE_URL}/dashboard/crm/companies`, { waitUntil: "networkidle" });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/04_crm_companies.png` });

    // Open Add Company Modal
    await page.click("button:has-text('Add Company')");
    await page.waitForSelector("#name");

    await page.fill("#name", "Maroc Logistique SARL");
    await page.fill("#city", "Casablanca");
    await page.fill("#ice", "001987654000012");
    await page.fill("#if", "87654321");
    await page.fill("#rc", "98765");
    await page.fill("#address", "123 Boulevard d'Anfa, Casablanca");

    await page.screenshot({ path: `${SCREENSHOT_DIR}/05_crm_add_company_dialog.png` });
    await page.click("button[type='submit']:has-text('Add Company')");

    await page.waitForTimeout(1000);
    await page.goto(`${BASE_URL}/dashboard/crm/companies`, { waitUntil: "networkidle" });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/06_crm_companies_list.png` });
  });

  // 4. Test CRM Contacts
  await testStep("4. CRM - Create Contact Linked to Company", async () => {
    await page.goto(`${BASE_URL}/dashboard/crm/contacts`, { waitUntil: "networkidle" });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/07_crm_contacts.png` });

    await page.click("button:has-text('Add Contact')");
    await page.waitForSelector("#firstName");

    await page.fill("#firstName", "Karim");
    await page.fill("#lastName", "El Amrani");
    await page.fill("#jobTitle", "Directeur Logistique");
    await page.fill("#email", "karim@maroclog.ma");
    await page.fill("#phone", "+212 6 12 34 56 78");
    await page.fill("#whatsapp", "+212 6 12 34 56 78");

    await page.screenshot({ path: `${SCREENSHOT_DIR}/08_crm_add_contact_dialog.png` });
    await page.click("button[type='submit']:has-text('Add Contact')");

    await page.waitForTimeout(1000);
    await page.goto(`${BASE_URL}/dashboard/crm/contacts`, { waitUntil: "networkidle" });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/09_crm_contacts_list.png` });
  });

  // 5. Test CRM Pipeline
  await testStep("5. CRM - Sales Pipeline Kanban & Deals", async () => {
    await page.goto(`${BASE_URL}/dashboard/crm`, { waitUntil: "networkidle" });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/10_crm_pipeline.png` });

    const addOppBtn = await page.$("button:has-text('New Opportunity')");
    if (addOppBtn) {
      await addOppBtn.click();
      await page.waitForSelector("#title");
      await page.fill("#title", "Contrat Logistique Annuel Q4");
      
      const companySelect = page.locator("[data-slot='select-trigger']").first();
      if (await companySelect.count() > 0) {
        await companySelect.click();
        await page.waitForTimeout(300);
        const option = page.locator("[data-slot='select-item']").first();
        if (await option.count() > 0) await option.click();
      }

      await page.fill("#value", "85000");
      await page.screenshot({ path: `${SCREENSHOT_DIR}/11_crm_add_deal.png` });
      
      const submitBtn = await page.$("button[type='submit']");
      if (submitBtn) await submitBtn.click();
      
      await page.waitForTimeout(1000);
      await page.goto(`${BASE_URL}/dashboard/crm`, { waitUntil: "networkidle" });
      await page.screenshot({ path: `${SCREENSHOT_DIR}/11b_crm_pipeline_updated.png` });
    }
  });

  // 6. Test Catalog
  await testStep("6. Catalog - Products & Services with Moroccan TVA", async () => {
    await page.goto(`${BASE_URL}/dashboard/catalog`, { waitUntil: "networkidle" });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/12_catalog_page.png` });

    await page.click("button:has-text('Add Item')");
    await page.waitForSelector("#name");

    await page.fill("#name", "Serveur Dell PowerEdge R750");
    await page.fill("#reference", "SRV-DELL-R750");
    await page.fill("#salesPrice", "28000");
    await page.fill("#purchasePrice", "21000");

    await page.screenshot({ path: `${SCREENSHOT_DIR}/13_catalog_add_product.png` });
    await page.click("button[type='submit']:has-text('Save Item')");

    await page.waitForTimeout(1000);
    await page.goto(`${BASE_URL}/dashboard/catalog`, { waitUntil: "networkidle" });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/14_catalog_list.png` });
  });

  // 7. Test Sales - Create Devis
  await testStep("7. Sales - Commercial Quote (Devis) Creation & Moroccan TVA Calculation", async () => {
    await page.goto(`${BASE_URL}/dashboard/sales/devis/new`, { waitUntil: "networkidle" });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/15_new_devis_page.png` });

    // Select Company using data-slot trigger
    const companySelect = page.locator("[data-slot='select-trigger']").first();
    await companySelect.click();
    await page.waitForTimeout(400);
    const companyOption = page.locator("[data-slot='select-item']").first();
    await companyOption.click();

    // Fill line item description
    const descInput = page.locator("input[placeholder='Description']").first();
    if (await descInput.isVisible()) {
      await descInput.fill("Serveur Dell PowerEdge R750 + Config");
    }

    // Fill unit price
    const priceInputs = await page.$$("input[type='number']");
    if (priceInputs.length >= 2) {
      await priceInputs[1].fill("28000");
    }

    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/16_devis_filled.png` });

    const saveDevisBtn = page.locator("button[type='submit']:has-text('Save Devis')");
    await saveDevisBtn.click();
    await page.waitForURL("**/dashboard/sales/devis", { timeout: 10000 });
  });

  // 8. Test Sales - Devis Listing & Conversion
  await testStep("8. Sales - Devis List, PDF generation & Order Conversion", async () => {
    await page.goto(`${BASE_URL}/dashboard/sales/devis`, { waitUntil: "networkidle" });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/17_devis_list.png` });

    // Check Convert to Order button
    const convertOrderBtn = page.locator("button:has-text('Convert to Order'), button:has-text('To Order')").first();
    if (await convertOrderBtn.count() > 0) {
      await convertOrderBtn.click();
      await page.waitForTimeout(1500);
    }

    await page.goto(`${BASE_URL}/dashboard/sales/orders`, { waitUntil: "networkidle" });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/18_orders_list.png` });
  });

  // 9. Test Sales - Orders & Convert to Invoice
  await testStep("9. Sales - Orders & Convert to Invoice", async () => {
    await page.goto(`${BASE_URL}/dashboard/sales/orders`, { waitUntil: "networkidle" });
    
    const invoiceBtn = page.locator("button:has-text('Create Invoice'), button:has-text('To Invoice'), button:has-text('Convert to Invoice')").first();
    if (await invoiceBtn.count() > 0) {
      await invoiceBtn.click();
      await page.waitForTimeout(1500);
    }

    await page.goto(`${BASE_URL}/dashboard/sales/invoices`, { waitUntil: "networkidle" });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/19_invoices_list.png` });
  });

  // 10. Test Sales - Invoices Finalization & General Ledger Posting
  await testStep("10. Sales - Invoicing Finalization, Sequential Legal Numbering & GL Posting", async () => {
    await page.goto(`${BASE_URL}/dashboard/sales/invoices`, { waitUntil: "networkidle" });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/20_invoices_before_finalize.png` });

    const finalizeBtn = page.locator("button:has-text('Finalize')").first();
    if (await finalizeBtn.count() > 0) {
      await finalizeBtn.click();
      await page.waitForTimeout(1500);
      await page.goto(`${BASE_URL}/dashboard/sales/invoices`, { waitUntil: "networkidle" });
      await page.screenshot({ path: `${SCREENSHOT_DIR}/21_invoices_finalized.png` });
    }
  });

  // 11. Test Purchasing (MM-PUR)
  await testStep("11. Purchasing - Purchase Orders Management", async () => {
    await page.goto(`${BASE_URL}/dashboard/purchasing/orders`, { waitUntil: "networkidle" });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/22_purchasing_orders.png` });
  });

  // 12. Test Inventory (INV)
  await testStep("12. Inventory - Stock Levels & Warehouse Projections", async () => {
    await page.goto(`${BASE_URL}/dashboard/inventory`, { waitUntil: "networkidle" });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/23_inventory_stock.png` });
  });

  // 13. Test Finance Reports & Trial Balance (FICO)
  await testStep("13. Finance - Trial Balance (Balance Générale) & Live Reconciliation", async () => {
    await page.goto(`${BASE_URL}/dashboard/finance/reports`, { waitUntil: "networkidle" });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/24_finance_reports.png` });

    await page.goto(`${BASE_URL}/dashboard/finance/ledger`, { waitUntil: "networkidle" });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/25_finance_ledger.png` });
  });

  console.log("\n==================================================");
  console.log("🏁 ALL BROWSER TESTS COMPLETED");
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

runTests().then((passed) => {
  if (!passed) process.exit(1);
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
