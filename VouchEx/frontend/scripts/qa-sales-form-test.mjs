/** Sales tab — registry + invoice form interactions. */
import { chromium } from 'playwright';

const baseUrl = process.argv[2] || 'https://vouchex.kuhu.org.in';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

async function login() {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(1500);
  const signIn = page.getByRole('button', { name: /sign in|log in|login|get started/i }).first();
  if (await signIn.isVisible({ timeout: 8000 }).catch(() => false)) {
    await signIn.click();
    await page.waitForTimeout(800);
  }
  await page.locator('input[type="email"]').first().fill('admin@vouchex.com');
  await page.locator('input[type="password"]').first().fill('user123');
  await page.getByRole('button', { name: /sign in|log in|continue|submit/i }).first().click();
  await page.waitForTimeout(4000);
}

try {
  await login();
  errors.length = 0;
  await page.locator('.sidebar-menu').getByRole('link', { name: 'Sales', exact: true }).click();
  await page.waitForTimeout(800);

  await page.getByRole('button', { name: /Raise New Invoice/i }).click();
  await page.waitForTimeout(800);

  const customerSelect = page.locator('select').filter({ has: page.locator('option', { hasText: 'Click to choose client' }) }).first();
  const opts = await customerSelect.locator('option').count();
  if (opts > 1) {
    await customerSelect.selectOption({ index: 1 });
    await page.waitForTimeout(400);
  }

  const issueDate = page.locator('input[type="date"]').first();
  if (await issueDate.isVisible().catch(() => false)) {
    await issueDate.fill('2026-06-20');
    await page.waitForTimeout(400);
  }

  const err = errors.find((e) => e.includes('ReferenceError') || e.includes('is not defined'));
  const formVisible = await page.getByText(/New Sales Invoice|Sales Invoice Billing/i).isVisible().catch(() => false);

  console.log('Form visible:', formVisible);
  console.log('Errors:', err || errors.join('\n') || '(none)');

  await page.getByRole('button', { name: /Back to Registry|Cancel Setup/i }).first().click().catch(() => {});
  await page.waitForTimeout(400);

  process.exitCode = err || !formVisible ? 1 : 0;
} finally {
  await browser.close();
}
