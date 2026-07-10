/**
 * Smoke-test portal tabs for runtime JS errors.
 * Usage: node scripts/smoke-tabs.mjs [baseUrl]
 */
import { chromium } from 'playwright';

const baseUrl = process.argv[2] || 'http://127.0.0.1:5173';
const email = process.env.VOUCHEX_TEST_EMAIL || 'admin@company.com';
const password = process.env.VOUCHEX_TEST_PASSWORD || 'user123';

const TABS = [
  'Dashboard',
  'Company 360°',
  'Financial Statements',
  'Chart of Accounts',
  'Customer Master',
  'Vendor Master',
  'Sales',
  'Sales Return',
  'Receipts',
  'Purchase',
  'Purchase Return',
  'Expenses',
  'Payments',
  'Inventory',
  'Consumption',
  'Taxation',
  'Settings',
];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (err) => errors.push(String(err)));

try {
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 60000 });

  // Marketing -> login if needed
  const loginBtn = page.getByRole('button', { name: /sign in|log in|login/i }).first();
  if (await loginBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await loginBtn.click();
    await page.fill('input[type="email"], input[name="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.getByRole('button', { name: /sign in|log in|continue/i }).click();
    await page.waitForTimeout(3000);
  }

  await page.waitForSelector('.sidebar-menu, .tab-container', { timeout: 30000 });

  for (const label of TABS) {
    errors.length = 0;
    const link = page.locator('.sidebar-menu').getByText(label, { exact: true });
    if (!(await link.count())) {
      console.log(`SKIP  ${label} (not in sidebar)`);
      continue;
    }
    await link.click();
    await page.waitForTimeout(400);
    const blank = await page.locator('.tab-container').evaluate((el) => {
      if (!el) return true;
      const text = (el.innerText || '').trim();
      return text.length < 20;
    });
    const err = errors[0];
    if (err) {
      console.log(`FAIL  ${label} — ${err.slice(0, 120)}`);
    } else if (blank) {
      console.log(`BLANK ${label}`);
    } else {
      console.log(`OK    ${label}`);
    }
  }
} catch (e) {
  console.error('Smoke test aborted:', e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
