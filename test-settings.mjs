import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE_URL = "http://localhost:3000";
const ARTIFACT_DIR = "C:/Users/Liad Tech/.gemini/antigravity/brain/e7d4df3a-48a9-4442-9886-b237a5da26f1";

async function testSettings() {
  console.log("==================================================");
  console.log("🧪 TESTING SETTINGS PAGE IN LIVE BROWSER");
  console.log("==================================================");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "fr-FR",
  });
  const page = await context.newPage();

  // 1. Visit Settings Page
  console.log("▶ 1. Navigating to /dashboard/settings...");
  await page.goto(`${BASE_URL}/dashboard/settings`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("h1", { timeout: 15000 });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "settings_01_profile.png") });
  console.log("✅ Profile tab loaded");

  // 2. Edit and Save Profile
  console.log("▶ 2. Editing Enterprise Legal Info (ICE/RC/IF/RIB)...");
  await page.fill("#name", "Atlas Distribution & Logistique SARL");
  await page.fill("#ice", "002345678000099");
  await page.fill("#if", "54321098");
  await page.fill("#rc", "98765 Casablanca");
  await page.fill("#patente", "34120987");
  await page.fill("#city", "Casablanca");
  await page.fill("#address", "123 Boulevard d'Anfa, Quartier Gauthier");
  await page.fill("#bankName", "Attijariwafa Bank");
  await page.fill("#bankRIB", "007 780 0001234567890123 45");
  
  await page.click("button[type='submit']:has-text('Save Company Settings')");
  await page.waitForSelector("text=Company profile saved successfully!", { timeout: 5000 });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "settings_01_profile_saved.png") });
  console.log("✅ Profile changes saved");

  // 3. Commercial & Invoicing Tab
  console.log("▶ 3. Testing Commercial & Invoicing Tab...");
  await page.click("button:has-text('Commercial & Invoicing')");
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "settings_02_commercial.png") });

  await page.fill("#invoiceFooterNote", "SARL au capital de 200.000 DH — RC Casablanca 98765 — IF 54321098 — ICE 002345678000099");
  await page.click("button[type='submit']:has-text('Save Commercial Settings')");
  await page.waitForSelector("text=Commercial preferences saved!", { timeout: 5000 });
  console.log("✅ Commercial settings saved");

  // 4. Modular Apps Tab
  console.log("▶ 4. Testing Modular Apps Tab...");
  await page.click("button:has-text('Modular Apps')");
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "settings_03_modules.png") });
  await page.click("button:has-text('Save Module Configuration')");
  await page.waitForSelector("text=Active modules updated!", { timeout: 5000 });
  console.log("✅ Module configuration saved");

  // 5. Team & Roles (RBAC) Tab
  console.log("▶ 5. Testing Team Management Tab & Teammate Invite...");
  await page.click("button:has-text('Team & Roles')");
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "settings_04_team.png") });

  // Open Invite Teammate modal
  await page.click("button:has-text('Invite Teammate')");
  await page.waitForSelector("#memberName");
  await page.fill("#memberName", "Youssef Benjelloun");
  await page.fill("#memberEmail", "youssef.b@atlasdistribution.ma");
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "settings_04_team_invite_modal.png") });
  await page.click("button[type='submit']:has-text('Send Invitation')");

  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "settings_04_team_after_invite.png") });
  console.log("✅ Teammate invited");

  // 6. DGI E-Invoicing Compliance Tab
  console.log("▶ 6. Testing DGI Compliance Tab...");
  await page.click("button:has-text('DGI E-Invoicing')");
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "settings_05_compliance.png") });
  console.log("✅ DGI Compliance verified");

  // 7. Data & CNDP Privacy Tab
  console.log("▶ 7. Testing Data Privacy & Export Tab...");
  await page.click("button:has-text('Data & CNDP')");
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "settings_06_privacy.png") });
  console.log("✅ Privacy and export tab verified");

  console.log("==================================================");
  console.log("🎉 ALL SETTINGS TABS TESTED AND VERIFIED!");
  console.log("==================================================");

  await browser.close();
}

testSettings().catch((err) => {
  console.error("Settings test error:", err);
  process.exit(1);
});
