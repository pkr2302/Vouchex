/**
 * API reproduction: advance receipt + invoice save for demo company
 */
const baseUrl = (process.argv[2] || 'https://vouchex.kuhu.org.in').replace(/\/$/, '');
const apiBase = `${baseUrl}/api`;
const email = process.env.VOUCHEX_TEST_EMAIL || 'admin@vouchex.com';
const password = process.env.VOUCHEX_TEST_PASSWORD || 'user123';
const companyId = 1;
const marker = `QAINV-${Date.now()}`;

async function api(method, path, token, body = null) {
  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/json', 'X-Company-Id': String(companyId) };
  const opts = { method, headers };
  if (body) {
    headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`${apiBase}${path}`, opts);
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  return { ok: res.ok, status: res.status, data, text };
}

function advanceAvailable(receipts, adjustments, customerId) {
  return receipts.filter((r) => r.is_advance && Number(r.customer_id) === Number(customerId))
    .map((r) => {
      const original = Number(r.amount_received || 0) + Number(r.tds_deducted || 0) + Number(r.discount_allowed || 0);
      const applied = adjustments.filter((a) => Number(a.advance_receipt_id) === Number(r.id))
        .reduce((s, a) => s + Number(a.adjustment_amount || 0), 0);
      return { id: r.id, ref: r.advance_reference, original, available: Math.max(0, original - applied) };
    })
    .filter((x) => x.available > 0.009);
}

const login = await api('POST', '/auth/login', null, { email, password });
if (!login.ok) {
  console.error('LOGIN FAIL', login.status, login.text?.slice(0, 300));
  process.exit(1);
}
const token = login.data.token;
console.log('Logged in:', login.data.user?.email);

const boot = await api('GET', '/portal/bootstrap', token);
if (!boot.ok) {
  console.error('BOOTSTRAP FAIL', boot.status);
  process.exit(1);
}
const d = boot.data;
console.log('Company:', d.companyDetails?.name);
console.log('advanceAdjustments in bootstrap:', Array.isArray(d.advanceAdjustments) ? d.advanceAdjustments.length : 'MISSING');
console.log('Advance receipts:', (d.receipts || []).filter((r) => r.is_advance).length);

const cust = d.customers?.[0];
if (!cust) { console.error('No customer'); process.exit(1); }
console.log('Test customer:', cust.id, cust.name, 'gst:', cust.gst_type);

const availBefore = advanceAvailable(d.receipts || [], d.advanceAdjustments || [], cust.id);
console.log('Available advances before:', availBefore);

// Create advance if none
let advanceReceipt = (d.receipts || []).find((r) => r.is_advance && Number(r.customer_id) === Number(cust.id));
if (!advanceReceipt) {
  const bank = d.bankAccounts?.[0] || d.coaRecords?.banks?.[0]?.name || 'HDFC Bank';
  const advRes = await api('POST', '/receipts', token, {
    parent: {
      customer_id: cust.id,
      customer_name: cust.name,
      payment_date: '2026-06-20',
      amount_received: 10000,
      tds_deducted: 0,
      discount_allowed: 0,
      currency: 'INR',
      payment_mode: 'Bank',
      deposit_to: bank,
      reference_no: 'NIL',
      is_advance: true,
      advance_reference: `${marker}-ADV`,
    },
  });
  console.log('Create advance:', advRes.ok ? 'OK' : `FAIL ${advRes.status}`, advRes.text?.slice(0, 400));
  advanceReceipt = advRes.data?.receipt;
}

const boot2 = await api('GET', '/portal/bootstrap', token);
const availAfter = advanceAvailable(boot2.data.receipts || [], boot2.data.advanceAdjustments || [], cust.id);
console.log('Available advances after:', availAfter);

const invNum = `${marker}/2026-27`;
const invRes = await api('POST', '/invoices', token, {
  invoice: {
    invoice_number: invNum,
    invoice_type: 'B2B',
    customer_id: cust.id,
    customer_name: cust.name,
    issue_date: '2026-06-20',
    due_date: '2026-06-20',
    billing_address: cust.billing_address || 'Test Address, Gujarat',
    shipping_address: cust.shipping_address || cust.billing_address || 'Test Address',
    place_of_supply: cust.billing_state || 'Gujarat',
    currency: 'INR',
    conversion_rate: 1,
    gstin: cust.gstin || '24AAAAA0000A1Z5',
    subtotal: 1000,
    discount: 0,
    tax_amount: 180,
    cgst: 90,
    sgst: 90,
    igst: 0,
    payable_tax: 180,
    total_amount: 1180,
    status: 'Unpaid',
  },
  items: [{ description: 'QA Item', quantity: 1, rate: 1000, line_total: 1000, hsn_sac: '9983' }],
});
console.log('Create invoice (no advance on save):', invRes.ok ? `OK id=${invRes.data?.invoice?.id}` : `FAIL ${invRes.status}`);
if (!invRes.ok) console.log(invRes.text?.slice(0, 500));

// Check if advance receipt has is_advance in bootstrap map
const advFromBoot = (boot2.data.receipts || []).filter((r) => r.is_advance);
if (advFromBoot.length) {
  console.log('Sample advance receipt fields:', JSON.stringify(advFromBoot[0], null, 2));
} else {
  console.log('WARNING: No is_advance receipts in bootstrap after create!');
  const anyRec = (boot2.data.receipts || []).slice(-3);
  console.log('Last receipts:', anyRec.map((r) => ({ id: r.id, is_advance: r.is_advance, invoice_id: r.invoice_id, advance_reference: r.advance_reference })));
}
