#!/usr/bin/env node
/**
 * Capture VouchEx portal screenshots for the marketing demo carousel.
 * Run: node scripts/capture-marketing-screenshots.mjs
 * Requires: npm install playwright && npx playwright install chromium
 */
import { mkdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '../../laravel-api/public/brand/demo');
const BASE = process.env.VOUCHEX_URL || 'https://vouchex.kuhu.org.in';
const EMAIL = process.env.VOUCHEX_DEMO_EMAIL || 'admin@company.com';
const PASS = process.env.VOUCHEX_DEMO_PASS || 'user123';

async function clickSidebar(page, label) {
  await page.locator('.sidebar-menu .menu-link').filter({ hasText: label }).first().click({ timeout: 12000 });
  await page.waitForTimeout(3000);
}

async function mockFinancialReports(page) {
  await page.route('**/gl/trial-balance**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        trial_balance: {
          as_of: '2026-06-14',
          rows: [
            { account_code: '1000', name: 'Cash & Bank', debit: 125000, credit: 0 },
            { account_code: '1100', name: 'Accounts Receivable', debit: 85000, credit: 0 },
            { account_code: '2000', name: 'Accounts Payable', debit: 0, credit: 42000 },
            { account_code: '3000', name: 'Capital Account', debit: 0, credit: 168000 },
          ],
          totals: { debit: 210000, credit: 210000 },
        },
      }),
    });
  });
  await page.route('**/gl/profit-and-loss**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        profit_and_loss: {
          from: '2026-04-01',
          to: '2026-06-14',
          income: [{ name: 'Sales', amount: 485000 }],
          expenses: [{ name: 'Purchases', amount: 312000 }, { name: 'Operating Expenses', amount: 48000 }],
          net_profit: 125000,
        },
      }),
    });
  });
  await page.route('**/gl/balance-sheet**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        balance_sheet: {
          as_of: '2026-06-14',
          assets: [{ name: 'Current Assets', amount: 210000 }],
          liabilities: [{ name: 'Current Liabilities', amount: 42000 }],
          equity: [{ name: 'Capital & Reserves', amount: 168000 }],
          totals: { assets: 210000, liabilities_and_equity: 210000 },
        },
      }),
    });
  });
}

async function main() {
  const { chromium } = await import('playwright');
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.getByRole('button', { name: /sign in/i }).first().click().catch(() => {});
  await page.waitForTimeout(800);

  const email = page.locator('input[type="email"], input[autocomplete="email"]').first();
  const password = page.locator('input[type="password"]').first();
  if (await email.count()) {
    await email.fill(EMAIL);
    await password.fill(PASS);
    await page.getByRole('button', { name: /sign in/i }).last().click();
    await page.waitForSelector('.sidebar-menu', { timeout: 20000 });
    await page.waitForTimeout(2000);
  }

  const shots = [
    { file: 'dashboard.png', nav: 'Dashboard' },
    { file: 'company-360.png', nav: 'Company 360°' },
    { file: 'financials.png', nav: 'Financial Statements' },
  ];

  for (const s of shots) {
    if (s.nav === 'Financial Statements') await mockFinancialReports(page);
    if (s.nav) await clickSidebar(page, s.nav);
    await page.screenshot({ path: path.join(OUT, s.file), fullPage: false });
    console.log('Saved', s.file);
  }

  await browser.close();
  console.log('Done →', OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
