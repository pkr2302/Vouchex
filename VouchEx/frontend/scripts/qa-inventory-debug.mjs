/**
 * Debug Inventory tab — capture page errors.
 * Usage: node scripts/qa-inventory-debug.mjs [baseUrl]
 */
import { chromium } from 'playwright';

const baseUrl = process.argv[2] || 'http://127.0.0.1:5174';
const email = 'admin@vouchex.com';
const password = 'user123';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(`PAGE: ${e}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(`CONSOLE: ${m.text()}`); });

await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(1500);
const signIn = page.getByRole('button', { name: /sign in|log in|login|get started/i }).first();
if (await signIn.isVisible({ timeout: 8000 }).catch(() => false)) {
  await signIn.click();
  await page.waitForTimeout(800);
}
await page.locator('input[type="email"]').first().fill(email);
await page.locator('input[type="password"]').first().fill(password);
await page.getByRole('button', { name: /sign in|log in|continue|submit/i }).first().click();
await page.waitForTimeout(4000);

// Select demo company if picker visible
const demo = page.getByText(/vouchex demo|demo company/i).first();
if (await demo.isVisible({ timeout: 2000 }).catch(() => false)) {
  await demo.click();
  await page.waitForTimeout(1500);
}

errors.length = 0;
await page.locator('.sidebar-menu').getByRole('link', { name: 'Inventory', exact: true }).click();
await page.waitForTimeout(1500);

const tabText = await page.locator('.tab-container').innerText().catch(() => '');
console.log('Tab text length:', tabText.trim().length);
console.log('Tab snippet:', tabText.slice(0, 200));
console.log('Errors:', errors.length ? errors.join('\n') : '(none)');

await browser.close();
process.exitCode = errors.length ? 1 : 0;
