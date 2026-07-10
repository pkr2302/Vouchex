/**
 * Extended QA — sub-tabs and key buttons on built bundle.
 * Usage: node scripts/qa-subtabs-test.mjs [baseUrl]
 */
import { chromium } from 'playwright';

const baseUrl = process.argv[2] || 'http://127.0.0.1:4173';
const email = process.env.VOUCHEX_TEST_EMAIL || 'admin@vouchex.com';
const password = process.env.VOUCHEX_TEST_PASSWORD || 'user123';

const SUBTAB_CHECKS = [
  { tab: 'Sales', buttons: [/Sales Registry/i, /Create Invoice/i] },
  { tab: 'Sales Return', buttons: [/Issue Credit Note/i] },
  { tab: 'Receipts', buttons: [/Record Receipt/i] },
  { tab: 'Purchase', buttons: [/Purchase Registry/i] },
  { tab: 'Expenses', buttons: [/Record Expense/i] },
  { tab: 'Payments', buttons: [/Record Payment/i, /Ageing/i] },
  { tab: 'Financial Statements', buttons: [/Profit/i, /Balance Sheet/i, /Trial Balance/i] },
  { tab: 'Taxation', buttons: [/GSTR-1/i] },
];

let failed = 0;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const allErrors = [];
page.on('pageerror', (err) => allErrors.push(String(err)));

async function login() {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(1500);
  const signIn = page.getByRole('button', { name: /sign in|log in|login|get started/i }).first();
  if (await signIn.isVisible({ timeout: 8000 }).catch(() => false)) {
    await signIn.click();
    await page.waitForTimeout(800);
  }
  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  if (await emailInput.isVisible({ timeout: 10000 }).catch(() => false)) {
    await emailInput.fill(email);
    await page.locator('input[type="password"]').first().fill(password);
    await page.getByRole('button', { name: /sign in|log in|continue|submit/i }).first().click();
    await page.waitForTimeout(4000);
  }
}

try {
  console.log(`\n=== Sub-tab QA @ ${baseUrl} ===\n`);
  await login();

  for (const { tab, buttons } of SUBTAB_CHECKS) {
    allErrors.length = 0;
    const link = page.locator('.sidebar-menu').getByRole('link', { name: tab, exact: true });
    if (!(await link.count())) {
      console.log(`SKIP  ${tab}`);
      continue;
    }
    await link.click();
    await page.waitForTimeout(700);

    for (const btnPat of buttons) {
      const btn = page.getByRole('button', { name: btnPat }).first();
      if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btn.click().catch(() => {});
        await page.waitForTimeout(400);
      }
    }

    const err = allErrors.find(
      (e) =>
        (e.includes('ReferenceError') || e.includes('is not defined') || e.includes('TypeError')) &&
        !e.includes('favicon')
    );
    if (err) {
      console.log(`FAIL  ${tab} — ${err.slice(0, 160)}`);
      failed++;
    } else {
      console.log(`OK    ${tab} (sub-tabs/buttons)`);
    }
  }

  console.log(`\n=== Result: ${failed === 0 ? 'ALL PASSED' : failed + ' failure(s)'} ===\n`);
  process.exitCode = failed > 0 ? 1 : 0;
} finally {
  await browser.close();
}
