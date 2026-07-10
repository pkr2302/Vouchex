/** Debug Sales tab — capture page errors. */
import { chromium } from 'playwright';

const baseUrl = process.argv[2] || 'http://127.0.0.1:4174';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

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

errors.length = 0;
await page.locator('.sidebar-menu').getByRole('link', { name: 'Sales', exact: true }).click();
await page.waitForTimeout(1500);

const tabText = await page.locator('.tab-container').innerText().catch(() => '');
console.log('Tab text length:', tabText.trim().length);
console.log('Snippet:', tabText.slice(0, 300));
console.log('Errors:', errors.length ? errors.join('\n') : '(none)');

await browser.close();
process.exitCode = errors.length || tabText.trim().length < 20 ? 1 : 0;
