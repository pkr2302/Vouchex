/**
 * Comprehensive edge QA — Demo Company only (company_id=1).
 * API + browser smoke for dates, currency, saves, blank tabs.
 *
 * IMPORTANT — what this script validates:
 *   API layer: save/reload of dates, currency, custom document numbers
 *   Browser: tab render smoke + **sync-survival** (user edits must survive ~6s live poll)
 *
 * Usage:
 *   node scripts/qa-edge-transactions.mjs [baseUrl]
 *   VOUCHEX_TEST_EMAIL=... VOUCHEX_TEST_PASSWORD=... node scripts/qa-edge-transactions.mjs
 */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const baseUrl = (process.argv[2] || 'https://vouchex.kuhu.org.in').replace(/\/$/, '');
const apiBase = `${baseUrl}/api`;
const email = process.env.VOUCHEX_TEST_EMAIL || 'admin@vouchex.com';
const password = process.env.VOUCHEX_TEST_PASSWORD || 'user123';
const companyId = 1;
const marker = `QAEDGE-${Date.now()}`;

const results = [];
const log = (id, status, detail) => {
  results.push({ id, status, detail });
  const icon = status === 'PASS' ? 'OK' : status === 'FAIL' ? 'FAIL' : 'WARN';
  console.log(`${icon.padEnd(5)} ${id} — ${detail}`);
};

async function api(method, path, token, body = null) {
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    'X-Company-Id': String(companyId),
  };
  const opts = { method, headers };
  if (body) {
    headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`${apiBase}${path}`, opts);
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  return { ok: res.ok, status: res.status, data, text };
}

function dateOnly(value) {
  if (!value) return '';
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  if (raw.includes('T') || /^\d{4}-\d{2}-\d{2}\s/.test(raw)) {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
    return raw.split(/[T\s]/)[0];
  }
  return raw.slice(0, 10);
}

const today = new Date();
const pad = (n) => String(n).padStart(2, '0');
const todayIso = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
const testIssueDate = '2026-04-01';

// --- API tests ---
async function runApiTests() {
  const login = await api('POST', '/auth/login', null, { email, password });
  if (!login.ok || !login.data?.token) {
    log('AUTH-01', 'FAIL', `Login failed HTTP ${login.status}`);
    return null;
  }
  const token = login.data.token;
  log('AUTH-01', 'PASS', `Logged in as ${login.data.user?.email}`);

  const boot = await api('GET', '/portal/bootstrap', token);
  if (!boot.ok) {
    log('BOOT-01', 'FAIL', `Bootstrap HTTP ${boot.status}`);
    return token;
  }
  const d = boot.data;
  log('BOOT-01', 'PASS', `${d.companyDetails?.name || 'company'} — inv:${d.invoices?.length} cust:${d.customers?.length}`);

  // Date normalization on bootstrap
  const sampleInv = d.invoices?.[0];
  if (sampleInv?.issue_date) {
    const norm = dateOnly(sampleInv.issue_date);
    if (norm.includes('T')) log('DATE-BOOT', 'FAIL', `Invoice issue_date still ISO: ${sampleInv.issue_date}`);
    else log('DATE-BOOT', 'PASS', `Bootstrap date normalized sample: ${norm}`);
  }

  const cust = d.customers?.[0];
  const vendor = d.vendors?.[0];
  const bank = d.bankAccounts?.[0] || 'Bank';
  const expHead = d.expenseHeads?.[0] || 'Office Expenses';
  if (!cust || !vendor) {
    log('DATA-01', 'WARN', 'Missing customer/vendor in demo company');
    return token;
  }

  // Invoice with explicit issue date 2026-04-01
  const invNum = `${marker}/2026-27`;
  const invRes = await api('POST', '/invoices', token, {
    invoice: {
      invoice_number: invNum,
      invoice_type: 'B2B',
      customer_id: cust.id,
      customer_name: cust.name,
      issue_date: testIssueDate,
      due_date: '2026-05-01',
      billing_address: 'QA Edge',
      shipping_address: 'QA Edge',
      place_of_supply: 'Gujarat',
      gstin: cust.gstin || '24AABCU9603R1ZM',
      currency: 'USD',
      conversion_rate: 83.5,
      subtotal: 100,
      tax_amount: 18,
      cgst: 9,
      sgst: 9,
      igst: 0,
      payable_tax: 18,
      total_amount: 118,
      status: 'Unpaid',
    },
    items: [{
      description: 'QA USD item',
      quantity: 1,
      rate: 100,
      line_total: 100,
      hsn_sac: '8471',
      tax_rate_override: 18,
      supply_mechanism: 'FCM',
    }],
  });
  let invId = null;
  if (invRes.ok) {
    invId = invRes.data.invoice?.id;
    const savedIssue = dateOnly(invRes.data.invoice?.issue_date);
    const savedCur = invRes.data.invoice?.currency;
    if (savedIssue === testIssueDate) log('DATE-INV', 'PASS', `Issue date saved as ${savedIssue}`);
    else log('DATE-INV', 'FAIL', `Expected ${testIssueDate} got ${savedIssue} (raw: ${invRes.data.invoice?.issue_date})`);
    if (savedCur === 'USD') log('CUR-INV', 'PASS', 'Invoice currency USD persisted');
    else log('CUR-INV', 'FAIL', `Expected USD got ${savedCur}`);
  } else {
    log('DATE-INV', 'FAIL', `Invoice create HTTP ${invRes.status}: ${invRes.text?.slice(0, 200)}`);
  }

  if (invId) {
    const payDate = testIssueDate;
    const recRes = await api('POST', '/receipts', token, {
      invoice_id: invId,
      invoice_number: invNum,
      customer_id: cust.id,
      customer_name: cust.name,
      payment_date: payDate,
      amount_received: 50,
      tds_deducted: 0,
      discount_allowed: 0,
      currency: 'USD',
      payment_mode: 'Bank',
      deposit_to: bank,
      reference_no: `${marker}-REC`,
      is_advance: false,
    });
    if (recRes.ok) {
      const pd = dateOnly(recRes.data.receipt?.payment_date);
      const rc = recRes.data.receipt?.currency;
      if (pd === payDate) log('DATE-REC', 'PASS', `Receipt date ${pd}`);
      else log('DATE-REC', 'FAIL', `Expected ${payDate} got ${pd}`);
      if (rc === 'USD') log('CUR-REC', 'PASS', 'Receipt currency USD persisted');
      else log('CUR-REC', 'FAIL', `Expected USD got ${rc}`);
    } else {
      log('DATE-REC', 'FAIL', `Receipt HTTP ${recRes.status}`);
    }
  }

  const expRes = await api('POST', '/expenses', token, {
    invoice_number: `${marker}-BILL`,
    expense_head: expHead,
    vendor_id: vendor.id,
    vendor_name: vendor.name,
    expense_date: testIssueDate,
    due_date: '2026-04-30',
    amount: 500,
    tax_rate: 18,
    tax_amount: 90,
    cgst: 45,
    sgst: 45,
    igst: 0,
    total_amount: 590,
    place_of_supply: 'Gujarat',
    currency: 'EUR',
    conversion_rate: 90,
    payment_status: 'Unpaid',
    record_type: 'expense',
  });
  let expId = null;
  if (expRes.ok) {
    expId = expRes.data.expense?.id;
    const ed = dateOnly(expRes.data.expense?.expense_date);
    if (ed === testIssueDate) log('DATE-EXP', 'PASS', `Expense date ${ed}`);
    else log('DATE-EXP', 'FAIL', `Expected ${testIssueDate} got ${ed}`);
    if (expRes.data.expense?.currency === 'EUR') log('CUR-EXP', 'PASS', 'Expense EUR persisted');
    else log('CUR-EXP', 'FAIL', `Expected EUR got ${expRes.data.expense?.currency}`);
  } else {
    log('DATE-EXP', 'FAIL', `Expense HTTP ${expRes.status}: ${expRes.text?.slice(0, 200)}`);
  }

  if (expId) {
    const payRes = await api('POST', '/payments', token, {
      expense_id: expId,
      expense_number: expRes.data.expense?.expense_number,
      payee: vendor.name,
      payment_date: testIssueDate,
      amount_paid: 590,
      tds_deducted: 0,
      currency: 'EUR',
      payment_mode: 'Bank Transfer',
      paid_from: bank,
      reference_no: `${marker}-PAY`,
      is_advance: false,
    });
    if (payRes.ok) {
      const pd = dateOnly(payRes.data.payment?.payment_date);
      if (pd === testIssueDate) log('DATE-PAY', 'PASS', `Payment disbursement date ${pd}`);
      else log('DATE-PAY', 'FAIL', `Expected ${testIssueDate} got ${pd} (raw: ${payRes.data.payment?.payment_date})`);
    } else {
      log('DATE-PAY', 'FAIL', `Payment HTTP ${payRes.status}`);
    }
  }

  // Re-bootstrap and verify dates on loaded records
  const boot2 = await api('GET', '/portal/bootstrap', token);
  if (boot2.ok && invId) {
    const inv = boot2.data.invoices?.find((i) => Number(i.id) === Number(invId));
    if (inv && dateOnly(inv.issue_date) === testIssueDate) log('DATE-RELOAD', 'PASS', 'Invoice issue_date correct after reload');
    else log('DATE-RELOAD', 'FAIL', `Reload issue_date: ${inv?.issue_date}`);
  }

  return token;
}

/** Static audit: useEffects that reset form fields when bootstrap arrays refresh (sync bug class). */
function runStaticSyncAudit() {
  const appPath = join(__dirname, '../src/App.jsx');
  let src = '';
  try {
    src = readFileSync(appPath, 'utf8');
  } catch (e) {
    log('AUDIT-SYNC', 'WARN', `Cannot read App.jsx: ${e.message}`);
    return;
  }
  const blocks = [...src.matchAll(/useEffect\(\(\) => \{[\s\S]*?\}, \[([^\]]*)\]\)/g)];
  const risky = [];
  for (const m of blocks) {
    const body = m[0];
    const deps = m[1];
    if (!/set\w*Number/i.test(body)) continue;
    if (!/\b(invoices|expenses|receipts|payments|creditNotes|debitNotes|customers|vendors)\b/.test(deps)) continue;
    if (/invoiceNumberUserEditedRef|skip\w+AutofillRef|last\w+Ref/.test(body)) continue;
    risky.push(deps.trim().slice(0, 80));
  }
  if (risky.length) {
    log('AUDIT-SYNC', 'FAIL', `${risky.length} useEffect(s) may reset document numbers on sync — deps: ${risky.join(' | ')}`);
  } else {
    log('AUDIT-SYNC', 'PASS', 'No obvious sync-reset useEffects on document number fields');
  }
}

async function loginAndSelectDemo(page) {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(1500);
  const signIn = page.getByRole('button', { name: /sign in|log in|login|get started/i }).first();
  if (await signIn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await signIn.click();
    await page.waitForTimeout(500);
  }
  await page.locator('input[type="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await page.getByRole('button', { name: /sign in|log in|continue|submit/i }).first().click();
  await page.waitForTimeout(4000);

  const companySelect = page.locator('select').filter({ has: page.locator('option') }).first();
  const demoOpt = page.locator('option').filter({ hasText: /demo/i }).first();
  if (await demoOpt.count()) {
    const val = await demoOpt.getAttribute('value');
    if (val) await companySelect.selectOption(val);
    await page.waitForTimeout(2000);
  }
}

/** Wait longer than SimulatorContext live sync (~5s). */
const SYNC_WAIT_MS = 6500;

async function runBrowserTests() {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (e) {
    log('BROWSER', 'WARN', `Playwright unavailable: ${e.message?.slice(0, 100)}`);
    return;
  }
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));

  try {
    await loginAndSelectDemo(page);

    const tabs = [
      'Dashboard', 'Sales', 'Receipts', 'Purchase', 'Expenses', 'Payments',
      'Inventory', 'Customer Master', 'Vendor Master', 'Settings',
    ];
    for (const label of tabs) {
      pageErrors.length = 0;
      const link = page.locator('.sidebar-menu').getByRole('link', { name: label, exact: true });
      if (!(await link.count())) {
        log(`UI-${label}`, 'WARN', 'Tab not in sidebar');
        continue;
      }
      await link.click();
      await page.waitForTimeout(700);
      const err = pageErrors.find((e) => /ReferenceError|is not defined|TypeError/.test(e));
      const blank = await page.locator('.tab-container').evaluate((el) => !el || (el.innerText || '').trim().length < 15).catch(() => true);
      if (err) log(`UI-${label}`, 'FAIL', err.slice(0, 120));
      else if (blank) log(`UI-${label}`, 'FAIL', 'Blank tab content');
      else log(`UI-${label}`, 'PASS', 'Rendered');
    }

    // Receipt form currency persistence (no invoice — advance)
    await page.locator('.sidebar-menu').getByRole('link', { name: 'Receipts', exact: true }).click();
    await page.waitForTimeout(600);
    const addBtn = page.getByRole('button', { name: /Add|Record|New/i }).first();
    if (await addBtn.isVisible().catch(() => false)) {
      await addBtn.click();
      await page.waitForTimeout(800);
      const curSelect = page.locator('.form-group').filter({ hasText: /currency/i }).locator('select').first();
      if (await curSelect.count()) {
        const opts = await curSelect.locator('option').allTextContents();
        const usdOpt = opts.find((o) => /USD/i.test(o));
        if (usdOpt) {
          await curSelect.selectOption({ label: usdOpt.trim() });
          await page.waitForTimeout(SYNC_WAIT_MS);
          const val = await curSelect.inputValue();
          if (/USD/i.test(val)) log('CUR-UI-REC', 'PASS', `Receipt currency stayed USD after ${SYNC_WAIT_MS}ms`);
          else log('CUR-UI-REC', 'FAIL', `Currency reverted to: ${val}`);
        }
      }
    }

    // Sales invoice number must survive live sync (SAL-SYNC-01)
    await page.locator('.sidebar-menu').getByRole('link', { name: 'Sales', exact: true }).click();
    await page.waitForTimeout(600);
    const raiseInv = page.getByRole('button', { name: /Raise New Invoice/i }).first();
    if (await raiseInv.isVisible().catch(() => false)) {
      await raiseInv.click();
      await page.waitForTimeout(800);
      const invInput = page.locator('.form-group').filter({ hasText: /Invoice Reference Number/i }).locator('input').first();
      if (await invInput.count()) {
        const customNum = `MANUAL-${marker}`;
        await invInput.fill(customNum);
        await page.waitForTimeout(SYNC_WAIT_MS);
        const after = await invInput.inputValue();
        if (after === customNum) log('NUM-UI-INV', 'PASS', `Invoice number stayed "${customNum}" after ${SYNC_WAIT_MS}ms sync`);
        else log('NUM-UI-INV', 'FAIL', `Invoice number reverted: expected "${customNum}" got "${after}"`);
      } else {
        log('NUM-UI-INV', 'WARN', 'Invoice Reference Number input not found');
      }

      // Sales currency sync survival (mirror receipt test)
      const salCur = page.locator('.form-group').filter({ hasText: /^Currency/i }).locator('select').first();
      if (await salCur.count()) {
        const opts = await salCur.locator('option').allTextContents();
        const usdOpt = opts.find((o) => /USD/i.test(o));
        if (usdOpt) {
          await salCur.selectOption({ label: usdOpt.trim() });
          await page.waitForTimeout(SYNC_WAIT_MS);
          const val = await salCur.inputValue();
          if (/USD/i.test(val)) log('CUR-UI-SAL', 'PASS', `Sales currency stayed USD after ${SYNC_WAIT_MS}ms`);
          else log('CUR-UI-SAL', 'FAIL', `Sales currency reverted to: ${val}`);
        }
      }
    } else {
      log('NUM-UI-INV', 'WARN', 'Raise New Invoice button not visible');
    }

    // Registry sort: first row should be newest by id (if 2+ rows)
    const firstInvCell = page.locator('.premium-table tbody tr').first().locator('td').first();
    if (await firstInvCell.isVisible().catch(() => false)) {
      log('SORT-UI-INV', 'PASS', 'Sales registry visible (manual: confirm newest on top)');
    }
  } catch (e) {
    log('BROWSER', 'FAIL', e.message);
  } finally {
    await browser.close();
  }
}

console.log(`\n=== Edge QA @ ${baseUrl} (company ${companyId}) ===\n`);
runStaticSyncAudit();
await runApiTests();
await runBrowserTests();

const fails = results.filter((r) => r.status === 'FAIL');
console.log(`\n=== Summary: ${results.length} tests, ${fails.length} failure(s) ===\n`);
if (fails.length) {
  fails.forEach((f) => console.log(`  ${f.id}: ${f.detail}`));
  process.exitCode = 1;
}
