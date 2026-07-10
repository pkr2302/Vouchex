/**
 * Debug invoice save on VouchEx Demo Company Pvt Ltd
 */
import { chromium } from 'playwright';

const baseUrl = 'https://vouchex.kuhu.org.in';
const email = 'admin@vouchex.com';
const password = 'user123';
const COMPANY = 'VouchEx Demo Company Pvt Ltd';

const browser = await chromium.launch({ headless: true, channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

const dialogs = [];
const consoleLogs = [];
const apiResponses = [];

page.on('dialog', async (d) => {
  dialogs.push(d.message());
  await d.accept();
});
page.on('console', (m) => consoleLogs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => consoleLogs.push(`[pageerror] ${e.message}`));
page.on('response', async (res) => {
  const url = res.url();
  if (url.includes('/api/invoices') || url.includes('/api/portal/bootstrap')) {
    let body = '';
    try { body = (await res.text()).slice(0, 300); } catch { /* */ }
    apiResponses.push({ url, status: res.status(), body });
  }
});

await page.goto(baseUrl);
await page.waitForTimeout(2000);
await page.getByRole('button', { name: /sign in/i }).first().click();
await page.waitForTimeout(1000);
await page.locator('input[type="email"]').fill(email);
await page.locator('input[type="password"]').fill(password);
await page.getByRole('button', { name: /sign in|log in|continue/i }).first().click();
await page.waitForTimeout(7000);

await page.locator('select.header-company-select').selectOption({ label: COMPANY });
await page.waitForTimeout(3000);

await page.locator('a.menu-link').filter({ hasText: 'Sales' }).first().click();
await page.waitForTimeout(1200);
await page.getByRole('button', { name: /Raise New Invoice/i }).click();
await page.waitForTimeout(1200);

const invCust = page.locator('.master-form select').filter({ has: page.locator('option', { hasText: /choose client/i }) }).first();
const opts = await invCust.locator('option').allTextContents();
console.log('Customers:', opts);

await invCust.selectOption({ index: 5 });
await page.waitForTimeout(1000);

// Check B2B validation fields
const billing = page.locator('textarea[placeholder*="Billing"]');
console.log('Billing value:', await billing.inputValue().catch(() => 'n/a'));

await page.locator('input[placeholder="Description *"]').fill('Demo QA item');
await page.locator('input[placeholder="Rate *"]').fill('2500');
await page.waitForTimeout(500);

const genBtn = page.getByRole('button', { name: /Generate Sales Invoice/i });
await genBtn.click();

for (const ms of [50, 100, 200, 500, 1000, 2000]) {
  await page.waitForTimeout(ms);
  const snap = await page.evaluate(() => ({
    overlays: document.querySelectorAll('.portal-modal-overlay').length,
    modalTitle: document.body.innerText.includes('Advance Receipt Available'),
    showPrompt: !!document.querySelector('.portal-modal-card-solid'),
  }));
  console.log(`t+${ms}ms`, JSON.stringify(snap));
}

console.log('--- API ---');
console.log(JSON.stringify(apiResponses, null, 2));
console.log('--- DIALOGS ---', dialogs);
console.log('--- CONSOLE (last 20) ---');
console.log(consoleLogs.slice(-20).join('\n'));
console.log('Form open:', await page.getByText('New Sales Invoice Billing Sheet').isVisible().catch(() => false));

await page.screenshot({ path: 'qa-demo-company-debug.png', fullPage: true });
await browser.close();
