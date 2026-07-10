/**
 * Smoke-test QA static build for runtime JS errors (no login — portal shell only).
 * Usage: npx serve ../laravel-api-testing/public -p 4173
 *        node scripts/smoke-tabs-qa.mjs http://127.0.0.1:4173
 */
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const baseUrl = process.argv[2] || 'http://127.0.0.1:4173';

const TABS = [
  'Dashboard', 'Company 360°', 'Financial Statements', 'Chart of Accounts',
  'Customer Master', 'Vendor Master', 'Sales', 'Sales Return', 'Receipts',
  'Purchase', 'Purchase Return', 'Expenses', 'Payments', 'Inventory',
  'Consumption', 'Taxation', 'Settings',
];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (err) => errors.push(String(err)));
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
});

try {
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2000);

  // Inject mock user if stuck on marketing — skip if no portal
  const hasSidebar = await page.locator('.sidebar-menu').count();
  if (!hasSidebar) {
    console.log('No sidebar (not logged in) — checking homepage only');
    const err = errors[0];
    console.log(err ? `FAIL  homepage — ${err.slice(0, 150)}` : 'OK    homepage (guest)');
    if (errors.length) errors.forEach((e, i) => console.log(`  err[${i}]: ${e.slice(0, 200)}`));
    process.exit(errors.length ? 1 : 0);
  }

  for (const label of TABS) {
    errors.length = 0;
    const link = page.locator('.sidebar-menu').getByText(label, { exact: true });
    if (!(await link.count())) {
      console.log(`SKIP  ${label}`);
      continue;
    }
    await link.click();
    await page.waitForTimeout(500);
    const blank = await page.locator('.tab-container').evaluate((el) => {
      if (!el) return true;
      return (el.innerText || '').trim().length < 20;
    });
    const err = errors[0];
    if (err) console.log(`FAIL  ${label} — ${err.slice(0, 150)}`);
    else if (blank) console.log(`BLANK ${label}`);
    else console.log(`OK    ${label}`);
  }
} catch (e) {
  console.error('Aborted:', e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
