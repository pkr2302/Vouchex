/**
 * Full repro: record advance → raise invoice → Generate (live site)
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
  await page.locator('input[type="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await page.getByRole('button', { name: /sign in|log in|continue/i }).first().click();
  await page.waitForTimeout(7000);
}

try {
  await login();

  // Receipt → Record Advance
  await page.locator('a.menu-link, .sidebar-menu a').filter({ hasText: 'Receipt' }).first().click();
  await page.waitForTimeout(1200);
  await page.locator('button.sub-tab-btn', { hasText: 'Record Advance' }).click();
  await page.waitForTimeout(800);

  const advCust = page.locator('.master-form select').first();
  await advCust.selectOption({ index: 1 });
  const selectedCustValue = await advCust.inputValue();
  console.log('Advance customer id:', selectedCustValue);

  await page.locator('.master-form input.form-input').nth(2).fill('7500');
  await page.getByRole('button', { name: /Save Advance Receipt/i }).click();
  await page.waitForTimeout(3500);

  // Sales invoice same customer
  await page.locator('a.menu-link, .sidebar-menu a').filter({ hasText: 'Sales' }).first().click();
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: /Raise New Invoice/i }).click();
  await page.waitForTimeout(1200);

  const invCust = page.locator('.master-form select').filter({ has: page.locator('option', { hasText: /choose client/i }) }).first();
  await invCust.selectOption(selectedCustValue);
  await page.waitForTimeout(1000);

  await page.locator('input[placeholder="Description *"]').first().fill('Advance QA item');
  await page.locator('input[placeholder="Rate *"]').first().fill('2000');
  await page.waitForTimeout(600);

  const genBtn = page.getByRole('button', { name: /Generate Sales Invoice/i });
  await genBtn.scrollIntoViewIfNeeded();
  await genBtn.click();
  await page.waitForTimeout(3000);

  const state = await page.evaluate(() => ({
    overlays: document.querySelectorAll('.portal-modal-overlay').length,
    modalText: document.body.innerText.includes('Advance Receipt Available'),
    skipBtn: !!document.querySelector('button')?.textContent?.includes('Skip'),
    formOpen: document.body.innerText.includes('New Sales Invoice Billing Sheet'),
    overlayHtml: document.querySelector('.portal-modal-overlay')?.outerHTML?.slice(0, 200) || null,
  }));

  console.log('--- ADVANCE FLOW RESULTS ---');
  console.log(JSON.stringify(state, null, 2));
  console.log('Dialogs:', JSON.stringify(dialogs));
  console.log('Page errors:', pageErrors.length ? pageErrors.join('\n') : '(none)');

  await page.screenshot({ path: 'qa-advance-invoice-live.png', fullPage: true });

  const broken = state.formOpen && !state.modalText && state.overlays === 0 && dialogs.length === 0;
  const modalMissing = state.formOpen && !state.modalText && state.overlays === 0 && dialogs.length > 0;
  if (broken) console.log('BUG REPRODUCED: form stuck, no modal, no validation dialogs');
  if (state.modalText) console.log('SUCCESS: Advance modal appeared');
  process.exitCode = broken || pageErrors.length ? 1 : 0;
} catch (err) {
  console.error('SCRIPT ERROR:', err);
  await page.screenshot({ path: 'qa-advance-invoice-error.png', fullPage: true }).catch(() => {});
  process.exitCode = 1;
} finally {
  await browser.close();
}
