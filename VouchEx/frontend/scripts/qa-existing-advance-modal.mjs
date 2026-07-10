/**
 * Test invoice save when customer already has advances (no new advance recorded).
 */
import { chromium } from 'playwright';

const baseUrl = (process.argv[2] || 'https://vouchex.kuhu.org.in').replace(/\/$/, '');
const email = process.env.VOUCHEX_TEST_EMAIL || 'admin@vouchex.com';
const password = process.env.VOUCHEX_TEST_PASSWORD || 'user123';

const browser = await chromium.launch({ headless: true, channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

const dialogs = [];
page.on('dialog', async (d) => {
  dialogs.push(d.message());
  await d.accept().catch(() => {});
});

async function login() {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(2000);
  await page.getByRole('button', { name: /sign in/i }).first().click();
  await page.waitForTimeout(1000);
  await page.locator('input[type="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await page.getByRole('button', { name: /sign in|log in|continue/i }).first().click();
  await page.waitForTimeout(7000);
}

async function tryInvoiceForCompany(companyLabel) {
  const companySelect = page.locator('select.header-company-select, select.desktop-only').first();
  await companySelect.selectOption({ label: companyLabel });
  await page.waitForTimeout(3000);

  await page.locator('a.menu-link, .sidebar-menu a').filter({ hasText: 'Sales' }).first().click();
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: /Raise New Invoice/i }).click();
  await page.waitForTimeout(1200);

  const invCust = page.locator('.master-form select').filter({ has: page.locator('option', { hasText: /choose client/i }) }).first();
  const opts = await invCust.locator('option').allTextContents();
  if (opts.length < 3) return { companyLabel, skipped: true, reason: 'few customers', opts };

  // pick customer index 2 (often QA / test customer)
  await invCust.selectOption({ index: 2 });
  await page.waitForTimeout(800);
  await page.locator('input[placeholder="Description *"]').first().fill('QA existing advance test');
  await page.locator('input[placeholder="Rate *"]').first().fill('1500');
  await page.waitForTimeout(400);

  await page.getByRole('button', { name: /Generate Sales Invoice/i }).click();
  await page.waitForTimeout(2500);

  return {
    companyLabel,
    customers: opts.length,
    overlays: await page.locator('.portal-modal-overlay').count(),
    modalText: await page.getByText('Advance Receipt Available').isVisible().catch(() => false),
    formOpen: await page.getByText('New Sales Invoice Billing Sheet').isVisible().catch(() => false),
    skipVisible: await page.getByRole('button', { name: /Skip/i }).isVisible().catch(() => false),
  };
}

try {
  await login();
  const companySelect = page.locator('select.header-company-select, select.desktop-only').first();
  const companies = await companySelect.locator('option').allTextContents();
  console.log('Companies:', companies.length);

  for (const label of companies.slice(0, 12)) {
    if (!label?.trim()) continue;
    const result = await tryInvoiceForCompany(label.trim());
    console.log(JSON.stringify(result));
    if (result.modalText || result.overlays > 0) {
      console.log('FOUND advance modal on company:', label);
      await page.screenshot({ path: 'qa-existing-advance-modal.png', fullPage: true });
      break;
    }
    // back out if form still open
    const back = page.getByRole('button', { name: /Back to Registry/i });
    if (await back.isVisible().catch(() => false)) await back.click();
    await page.waitForTimeout(500);
  }
  console.log('Dialogs:', dialogs);
} finally {
  await browser.close();
}
