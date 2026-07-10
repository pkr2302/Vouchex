import { toAmount } from './formatMoney';

function ledgerName(entry) {
  if (entry == null) return '';
  return typeof entry === 'string' ? entry : String(entry.name ?? '');
}

function normalizeLedgers(list = []) {
  return [...new Set(list.map(ledgerName).filter(Boolean))];
}

function receiptHitsBank(r, banks) {
  const deposit = String(r.deposit_to || '').trim();
  const mode = String(r.payment_mode || '');
  if (deposit && banks.includes(deposit)) return true;
  if (mode.startsWith('Bank:')) {
    const name = mode.replace(/^Bank:\s*/i, '').trim();
    return banks.includes(name);
  }
  return false;
}

function receiptHitsCash(r, cashLedgers) {
  const deposit = String(r.deposit_to || '').trim();
  const mode = String(r.payment_mode || '');
  if (deposit && cashLedgers.includes(deposit)) return true;
  if (mode.startsWith('Cash:')) {
    const name = mode.replace(/^Cash:\s*/i, '').trim();
    return cashLedgers.includes(name);
  }
  return false;
}

function paymentHitsBank(p, banks) {
  const from = String(p.paid_from || '').trim();
  const mode = String(p.payment_mode || '');
  if (from && banks.includes(from)) return true;
  if (mode.startsWith('Bank:')) {
    const name = mode.replace(/^Bank:\s*/i, '').trim();
    return banks.includes(name);
  }
  return false;
}

function paymentHitsCash(p, cashLedgers) {
  const from = String(p.paid_from || '').trim();
  const mode = String(p.payment_mode || '');
  if (from && cashLedgers.includes(from)) return true;
  if (mode.startsWith('Cash:')) {
    const name = mode.replace(/^Cash:\s*/i, '').trim();
    return cashLedgers.includes(name);
  }
  return false;
}

function currencyCode(row) {
  return String(row?.currency || 'INR').toUpperCase();
}

/** Per-currency balances for bank/cash ledgers, net of FX conversions. */
export function computeMultiCurrencyBalances(
  receipts = [],
  payments = [],
  conversions = [],
  bankAccounts = [],
  cashLedgers = []
) {
  const banks = normalizeLedgers(bankAccounts);
  const cash = normalizeLedgers(cashLedgers);
  const byCurrency = {};

  const add = (cur, ledger, delta) => {
    if (!cur || !ledger) return;
    const key = `${cur}|${ledger}`;
    byCurrency[key] = (byCurrency[key] || 0) + delta;
  };

  receipts.forEach((r) => {
    const cur = currencyCode(r);
    const amt = toAmount(r.amount_received);
    if (receiptHitsBank(r, banks)) add(cur, r.deposit_to || 'Bank', amt);
    if (receiptHitsCash(r, cash)) add(cur, r.deposit_to || 'Cash', amt);
  });

  payments.forEach((p) => {
    const cur = currencyCode(p);
    const amt = toAmount(p.amount_paid);
    if (paymentHitsBank(p, banks)) add(cur, p.paid_from || 'Bank', -amt);
    if (paymentHitsCash(p, cash)) add(cur, p.paid_from || 'Cash', -amt);
  });

  (conversions || []).forEach((c) => {
    const fromCur = String(c.from_currency || '').toUpperCase();
    const toCur = String(c.to_currency || 'INR').toUpperCase();
    if (c.from_ledger) add(fromCur, c.from_ledger, -toAmount(c.from_amount));
    if (c.to_ledger) add(toCur, c.to_ledger, toAmount(c.to_amount));
  });

  const grouped = {};
  Object.entries(byCurrency).forEach(([key, bal]) => {
    const [cur, ledger] = key.split('|');
    if (!grouped[cur]) grouped[cur] = [];
    grouped[cur].push({ ledger, balance: Math.round(bal * 100) / 100 });
  });

  return grouped;
}

/** Real balances from receipts/payments tied to COA ledgers only — no demo opening balance. */
export function computeBankCashBalances(receipts = [], payments = [], bankAccounts = [], cashLedgers = []) {
  const banks = normalizeLedgers(bankAccounts);
  const cash = normalizeLedgers(cashLedgers);

  let bankBalance = null;
  let cashBalance = null;

  if (banks.length > 0) {
    const bankIn = receipts
      .filter((r) => receiptHitsBank(r, banks))
      .reduce((sum, r) => sum + toAmount(r.amount_received), 0);
    const bankOut = payments
      .filter((p) => paymentHitsBank(p, banks))
      .reduce((sum, p) => sum + toAmount(p.amount_paid), 0);
    bankBalance = bankIn - bankOut;
  }

  if (cash.length > 0) {
    const cashIn = receipts
      .filter((r) => receiptHitsCash(r, cash))
      .reduce((sum, r) => sum + toAmount(r.amount_received), 0);
    const cashOut = payments
      .filter((p) => paymentHitsCash(p, cash))
      .reduce((sum, p) => sum + toAmount(p.amount_paid), 0);
    cashBalance = cashIn - cashOut;
  }

  return {
    bankBalance,
    cashBalance,
    hasBankLedgers: banks.length > 0,
    hasCashLedgers: cash.length > 0,
    showLedgerBalances: banks.length > 0 || cash.length > 0,
    multiCurrency: computeMultiCurrencyBalances(receipts, payments, [], bankAccounts, cashLedgers),
  };
}
