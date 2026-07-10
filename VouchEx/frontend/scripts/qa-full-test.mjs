/**
 * Full QA smoke test — login, all tabs, Settings backup button.
 * Usage: node scripts/qa-full-test.mjs [baseUrl]
 * Requires: npx playwright install chromium (once)
 */
import { chromium } from 'playwright';

const baseUrl = process.argv[2] || 'http://127.0.0.1:5174';
const email = process.env.VOUCHEX_TEST_EMAIL || 'admin@vouchex.com';
const password = process.env.VOUCHEX_TEST_PASSWORD || 'user123';

const TABS = [
  'Dashboard',
  'Company 360°',
  'Financial Statements',
  'Chart of Accounts',
  'Customer Master',
  'Vendor Master',
  'Sales',
  'Sales Return',
  'Receipts',
  'Purchase',
  'Purchase Return',
  'Expenses',
  'Payments',
  'Inventory',
  'Consumption',
  'Taxation',
  'Settings',
];

let browser;
let failed = 0;

try {
  browser = await chromium.launch({ headless: true });
} catch (e) {
  console.error('PLAYWRIGHT_MISSING:', e.message?.slice(0, 200));
  console.error('Run: cd frontend && npx playwright install chromium');
  process.exit(2);
}

const page = await browser.newPage();
const allErrors = [];

page.on('pageerror', (err) => allErrors.push(String(err)));
page.on('console', (msg) => {
  if (msg.type() === 'error') allErrors.push(msg.text());
});

try {
  console.log(`\n=== QA test @ ${baseUrl} (${email}) ===\n`);

  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(1500);

  // Guest marketing or portal
  const signIn = page.getByRole('button', { name: /sign in|log in|login|get started/i }).first();
  if (await signIn.isVisible({ timeout: 8000 }).catch(() => false)) {
    await signIn.click();
    await page.waitForTimeout(800);
  }

  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  if (await emailInput.isVisible({ timeout: 10000 }).catch(() => false)) {
    await emailInput.fill(email);
    await page.locator('input[type="password"]').first().fill(password);
    const submit = page.getByRole('button', { name: /sign in|log in|continue|submit/i }).first();
    await submit.click();
    await page.waitForTimeout(4000);
  }

  const hasSidebar = await page.locator('.sidebar-menu').count();
  if (!hasSidebar) {
    console.log('FAIL  Login — sidebar not found after login');
    const body = await page.locator('body').innerText().catch(() => '');
    console.log('Page snippet:', body.slice(0, 300));
    failed++;
  } else {
    console.log('OK    Login — portal loaded');
  }

  for (const label of TABS) {
    allErrors.length = 0;
    const link = page.locator('.sidebar-menu').getByRole('link', { name: label, exact: true });
    if (!(await link.count())) {
      console.log(`SKIP  ${label}`);
      continue;
    }
    await link.click();
    await page.waitForTimeout(label === 'Inventory' ? 1200 : 600);

    const blank = await page.locator('.tab-container').evaluate((el) => {
      if (!el) return true;
      return (el.innerText || '').trim().length < 20;
    }).catch(() => true);

    const err = allErrors.find(
      (e) =>
        (e.includes('ReferenceError') || e.includes('is not defined') || e.includes('TypeError')) &&
        !e.includes('favicon')
    );
    if (err) {
      console.log(`FAIL  ${label} — ${err.slice(0, 140)}`);
      failed++;
    } else if (blank) {
      console.log(`BLANK ${label}`);
      failed++;
    } else if (label === 'Inventory') {
      const hasTitle = await page.locator('.tab-container').getByText(/Inventory Master/i).count();
      if (!hasTitle) {
        console.log(`FAIL  Inventory — table header missing`);
        failed++;
      } else {
        console.log(`OK    ${label}`);
      }
    } else {
      console.log(`OK    ${label}`);
    }
  }

  // Settings → Data Backups → test button visible
  allErrors.length = 0;
  const settingsLink = page.locator('.sidebar-menu').getByRole('link', { name: 'Settings', exact: true });
  if (await settingsLink.count()) {
    await settingsLink.click();
    await page.waitForTimeout(500);
    const websiteNav = page.getByRole('button', { name: 'Website Settings' });
    if (await websiteNav.isVisible({ timeout: 3000 }).catch(() => false)) {
      await websiteNav.click();
      await page.waitForTimeout(400);
    }
    const backupTab = page.getByRole('button', { name: /Data Backups/i }).first();
    if (await backupTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await backupTab.click();
      await page.waitForTimeout(800);
      const testBtn = page.getByRole('button', { name: /send backup email now/i });
      if (await testBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('OK    Backup test button — visible');
        // Click and check for alert or API response (don't fail on mail errors)
        page.once('dialog', async (d) => {
          console.log('INFO  Backup click dialog:', d.message().slice(0, 120));
          await d.accept();
        });
        await testBtn.click();
        await page.waitForTimeout(3000);
        const err = allErrors.find((e) => e.includes('ReferenceError') || e.includes('is not defined'));
        if (err) {
          console.log(`FAIL  Backup button click — ${err.slice(0, 140)}`);
          failed++;
        } else {
          console.log('OK    Backup button — click did not crash page');
        }
      } else {
        console.log('FAIL  Backup test button — not found (super admin? wrong tab?)');
        failed++;
      }
    } else {
      console.log('SKIP  Data Backups sub-tab not visible');
    }
  }

  console.log(`\n=== Result: ${failed === 0 ? 'ALL PASSED' : failed + ' failure(s)'} ===\n`);
  process.exitCode = failed > 0 ? 1 : 0;
} catch (e) {
  console.error('Aborted:', e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
