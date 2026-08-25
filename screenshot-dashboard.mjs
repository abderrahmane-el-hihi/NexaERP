import { chromium } from "playwright";
import fs from "fs";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 }
  });
  await page.goto('http://localhost:3000/dashboard');
  
  // Wait for fonts and things to settle
  await page.waitForTimeout(2000);
  
  await page.screenshot({ path: 'screenshots/ledger_dashboard.png' });
  await browser.close();
  console.log("Screenshot saved to screenshots/ledger_dashboard.png");
})();
