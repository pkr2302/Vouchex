/**
 * Reproduce: advance receipt → sales invoice save button
 * Usage: node scripts/qa-invoice-advance-save.mjs [baseUrl]
 */
import { chromium } from 'playwright';

const baseUrl = (process.argv[2] || 'https://vouchex.kuhu.org.in').replace(/\/$/, '');
const email = process.env.VOUCHEX_TEST_EMAIL || 'admin@vouchex.com';
const password = process.env.VOUCHEX_TEST_PASSWORD || 'user123';

const browser = await chromium.launch({
  headless: true,
  channel: process.env.PW_CHANNEL || 'msedge',
});
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

const consoleLogs = [];
const pageErrors = [];
const dialogs = [];

page.on('console', (msg) => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
page.on('pageerror', (e) => pageErrors.push(String(e)));
page.on('dialog', async (d) => {
  dialogs.push({ type: d.type(), message: d.message() });
  await d.accept().catch(() => {});
});

async function login() {
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 90000 });
  const signIn = page.getByRole('button', { name: /sign in|log in|login|get started/i }).first();
  if (await signIn.isVisible({ timeout: 8000 }).catch(() => false)) {
    await signIn.click();
    await page.waitForTimeout(600);
  }
  await page.locator('input[type="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await page.getByRole('button', { name: /sign in|log in|continue|submit/i }).first().click();
  await page.waitForTimeout(5000);
}

async function selectDemoCompany() {
  const companySelect = page.locator('select').filter({ hasText: /company|demo/i }).first();
  if (await companySelect.isVisible({ timeout: 3000 }).catch(() => false)) {
    const opts = await companySelect.locator('option').allTextContents();
    const demoIdx = opts.findIndex((t) => /demo/i.test(t));
    if (demoIdx >= 0) await companySelect.selectOption({ index: demoIdx });
    await page.waitForTimeout(2000);
  }
}

try {
  await login();
  await selectDemoCompany();

  const jsBundle = await page.evaluate(() => {
    const s = document.querySelector('script[type="module"][src*="/assets/index-"]');
    return s?.getAttribute('src') || 'unknown';
  });
  console.log('JS bundle:', jsBundle);

  // Receipt → Record Advance
  await page.locator('.sidebar-menu').getByRole('link', { name: 'Receipt', exact: true }).click();
  await page.waitForTimeout(1000);
  await page.getByRole('button', { name: 'Record Advance', exact: true }).click();
  await page.waitForTimeout(800);

  const custSelect = page.locator('.master-form select').first();
  const custOpts = await custSelect.locator('option').allTextContents();
  console.log('Advance customers:', custOpts.slice(0, 5));
  if (custOpts.length > 1) await custSelect.selectOption({ index: 1 });
  await page.waitForTimeout(400);

  const amountInput = page.locator('.master-form input[type="number"], .master-form input').filter({ hasNot: page.locator('[type="date"]') });
  const amt = amountInput.filter({ has: page.locator('..') }).first();
  await page.locator('.master-form').getByRole('spinbutton').first().fill('5000').catch(async () => {
    await page.locator('.master-form input').nth(2).fill('5000');
  });
  await page.waitForTimeout(300);

  const saveAdvanceBtn = page.getByRole('button', { name: /Save Advance|Post|Record Advance/i }).first();
  if (await saveAdvanceBtn.isVisible().catch(() => false)) {
    await saveAdvanceBtn.click();
    await page.waitForTimeout(3000);
  }

  // Sales → invoice
  await page.locator('.sidebar-menu').getByRole('link', { name: 'Sales', exact: true }).click();
  await page.waitForTimeout(1000);
  await page.getByRole('button', { name: /Raise New Invoice/i }).click();
  await page.waitForTimeout(1000);

  const invCust = page.locator('select').filter({ has: page.locator('option', { hasText: /choose client/i }) }).first();
  const invCustOpts = await invCust.locator('option').allTextContents();
  const sameCustIdx = Math.max(1, invCustOpts.length > 1 ? 1 : 0);
  if (invCustOpts.length > 1) await invCust.selectOption({ index: sameCustIdx });
  await page.waitForTimeout(800);

  await page.locator('input[type="date"]').first().fill('2026-06-20');
  await page.waitForTimeout(300);

  // Line item: description + rate
  const desc = page.locator('.invoice-items-table input[placeholder*="Description"]').first();
  if (await desc.isVisible().catch(() => false)) {
    await desc.fill('QA Test Item');
  }
  const rate = page.locator('.invoice-items-table input[placeholder*="Rate"]').first();
  if (await rate.isVisible().catch(() => false)) {
    await rate.fill('1000');
  }
  await page.waitForTimeout(500);

  const beforeInvoices = await page.evaluate(() => document.querySelectorAll('.premium-table tbody tr').length);

  const genBtn = page.getByRole('button', { name: /Generate Sales Invoice/i });
  const btnInfo = await genBtn.evaluate((el) => ({
    type: el.getAttribute('type'),
    disabled: el.disabled,
    pointerEvents: getComputedStyle(el).pointerEvents,
    visible: el.offsetParent !== null,
    className: el.className,
  }));
  console.log('Generate button:', JSON.stringify(btnInfo));

  await genBtn.click({ force: true });
  await page.waitForTimeout(3000);

  const modalVisible = await page.getByText(/Advance Receipt Available/i).isVisible().catch(() => false);
  const apiError = await page.locator('.api-error-overlay, .portal-modal-overlay-solid').first().isVisible().catch(() => false);
  const formStillOpen = await page.getByText(/New Sales Invoice|Sales Invoice Billing/i).isVisible().catch(() => false);
  const overlayCount = await page.locator('.portal-modal-overlay, .modal-overlay').count();

  console.log('--- RESULTS ---');
  console.log('Advance modal visible:', modalVisible);
  console.log('Form still open:', formStillOpen);
  console.log('Overlay count:', overlayCount);
  console.log('Dialogs:', JSON.stringify(dialogs));
  console.log('Page errors:', pageErrors.length ? pageErrors.join('\n') : '(none)');
  console.log('Recent console:', consoleLogs.slice(-15).join('\n'));

  const screenshotPath = 'qa-invoice-save-debug.png';
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log('Screenshot:', screenshotPath);

  process.exitCode = pageErrors.length || (!modalVisible && formStillOpen && dialogs.length === 0) ? 1 : 0;
} catch (err) {
  console.error('SCRIPT ERROR:', err);
  process.exitCode = 1;
} finally {
  await browser.close();
}
