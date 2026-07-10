/**
 * Live repro: login → Sales → raise invoice → click Generate
 * Usage: node scripts/qa-invoice-save-live.mjs [baseUrl]
 */
import { chromium } from 'playwright';

const baseUrl = (process.argv[2] || 'https://vouchex.kuhu.org.in').replace(/\/$/, '');
const email = process.env.VOUCHEX_TEST_EMAIL || 'admin@vouchex.com';
const password = process.env.VOUCHEX_TEST_PASSWORD || 'user123';

const browser = await chromium.launch({ headless: true, channel: process.env.PW_CHANNEL || 'msedge' });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

const dialogs = [];
const pageErrors = [];
page.on('dialog', async (d) => {
  dialogs.push({ type: d.type(), message: d.message() });
  await d.accept().catch(() => {});
});
page.on('pageerror', (e) => pageErrors.push(String(e)));

async function login() {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(2000);
  const signIn = page.getByRole('button', { name: /sign in/i }).first();
  if (await signIn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await signIn.click();
    await page.waitForTimeout(1000);
  }
  const emailInput = page.locator('input[type="email"]').first();
  if (await emailInput.isVisible({ timeout: 8000 }).catch(() => false)) {
    await emailInput.fill(email);
    await page.locator('input[type="password"]').first().fill(password);
    const submit = page.getByRole('button', { name: /sign in|log in|continue|submit/i }).first();
    await submit.click();
    await page.waitForTimeout(7000);
  }
}

try {
  await login();

  const bundle = await page.evaluate(() => {
    const s = document.querySelector('script[type="module"][src*="/assets/index-"]');
    return s?.getAttribute('src') || 'unknown';
  });
  console.log('JS bundle:', bundle);

  // Navigate Sales via sidebar or mobile nav
  const salesLink = page.locator('a.menu-link, .sidebar-menu a, .sidebar-nav a').filter({ hasText: 'Sales' }).first();
  await salesLink.click({ timeout: 20000 });
  await page.waitForTimeout(1500);

  await page.getByRole('button', { name: /Raise New Invoice/i }).click({ timeout: 15000 });
  await page.waitForTimeout(1200);

  const custSelect = page.locator('.master-form select').filter({ has: page.locator('option', { hasText: /choose client/i }) }).first();
  const custTexts = await custSelect.locator('option').allTextContents();
  console.log('Customers (first 8):', custTexts.slice(0, 8));

  // Pick a customer that likely has advances (index 2+) or any non-empty
  const pickIdx = Math.min(2, Math.max(1, custTexts.length - 1));
  await custSelect.selectOption({ index: pickIdx });
  await page.waitForTimeout(1000);

  // Fill line item
  const desc = page.locator('.invoice-items-table input').first();
  await desc.fill('QA Test Line');
  const inputs = page.locator('.invoice-items-table input');
  const count = await inputs.count();
  for (let i = 0; i < count; i++) {
    const ph = await inputs.nth(i).getAttribute('placeholder');
    if (ph && /rate/i.test(ph)) {
      await inputs.nth(i).fill('1500');
      break;
    }
  }
  await page.waitForTimeout(600);

  const genBtn = page.getByRole('button', { name: /Generate Sales Invoice/i });
  const before = await genBtn.evaluate((el) => ({
    type: el.getAttribute('type'),
    disabled: el.disabled,
    pe: getComputedStyle(el).pointerEvents,
    cls: el.className,
  }));
  console.log('Generate button before click:', JSON.stringify(before));

  await genBtn.scrollIntoViewIfNeeded();
  await genBtn.click();
  await page.waitForTimeout(2500);

  const after = await page.evaluate(() => ({
    overlays: document.querySelectorAll('.portal-modal-overlay').length,
    modalTitle: !!document.body.innerText.includes('Advance Receipt Available'),
    formOpen: !!document.body.innerText.includes('New Sales Invoice Billing Sheet'),
    btnSubmitting: document.querySelectorAll('.btn-submitting').length,
  }));

  console.log('--- RESULTS ---');
  console.log('After click:', JSON.stringify(after));
  console.log('Dialogs:', JSON.stringify(dialogs));
  console.log('Page errors:', pageErrors.length ? pageErrors.join('\n') : '(none)');

  await page.screenshot({ path: 'qa-invoice-save-live.png', fullPage: true });
  console.log('Screenshot: qa-invoice-save-live.png');

  const failed = pageErrors.length > 0 || (after.formOpen && after.overlays === 0 && dialogs.length === 0 && !after.modalTitle);
  process.exitCode = failed ? 1 : 0;
} catch (err) {
  console.error('SCRIPT ERROR:', err);
  await page.screenshot({ path: 'qa-invoice-save-live-error.png', fullPage: true }).catch(() => {});
  process.exitCode = 1;
} finally {
  await browser.close();
}
