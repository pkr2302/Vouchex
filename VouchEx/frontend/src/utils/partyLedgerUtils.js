import { sameId, toAmount, dateOnly, parseDateOnlyLocal } from './formatMoney';
import {
  creditNoteTotalForInvoice,
  debitNoteTotalForExpense,
  expenseSettledAmount,
  invoiceSettledAmount,
  invoiceOutstandingAmount,
  expenseOutstandingAmount,
} from './accountingHelpers';
import { advanceReferenceLabel } from './advanceHelpers';

const ledgerTimestamp = (value) => parseDateOnlyLocal(value)?.getTime() ?? 0;

export function buildCustomerLedger(customer, invoices = [], receipts = [], creditNotes = [], advanceAdjustments = []) {
  if (!customer) return [];

  const custInvoices = invoices.filter(
    (inv) => sameId(inv.customer_id, customer.id) && inv.status !== 'Cancelled'
  );
  const custReceipts = receipts.filter((rec) => sameId(rec.customer_id, customer.id));
  const entries = [];

  entries.push({
    date: dateOnly(customer.opening_balance_date) || '2026-04-01',
    description: 'Opening Balance',
    type: 'Opening',
    reference: 'OPEN',
    debit: toAmount(customer.opening_balance),
    credit: 0,
    timestamp: ledgerTimestamp(customer.opening_balance_date || '2026-04-01'),
  });

  custInvoices.forEach((inv) => {
    entries.push({
      date: dateOnly(inv.issue_date),
      description: `Sales Invoice (${inv.invoice_number})`,
      type: 'Invoice',
      reference: inv.invoice_number,
      debit: toAmount(inv.total_amount),
      credit: 0,
      timestamp: ledgerTimestamp(inv.issue_date),
    });
  });

  custReceipts.filter((rec) => !rec.is_advance).forEach((rec) => {
    entries.push({
      date: dateOnly(rec.payment_date),
      description: `Receipt (${rec.receipt_number})`,
      type: 'Receipt',
      reference: rec.receipt_number,
      debit: 0,
      credit: toAmount(rec.amount_received) + toAmount(rec.tds_deducted) + toAmount(rec.discount_allowed),
      timestamp: ledgerTimestamp(rec.payment_date),
    });
  });

  (advanceAdjustments || [])
    .filter((adj) => {
      const rec = receipts.find((r) => sameId(r.id, adj.advance_receipt_id));
      return rec && sameId(rec.customer_id, customer.id);
    })
    .forEach((adj) => {
      const rec = receipts.find((r) => sameId(r.id, adj.advance_receipt_id));
      entries.push({
        date: dateOnly(adj.adjustment_date),
        description: `Advance applied (${advanceReferenceLabel(rec)})`,
        type: 'Advance Apply',
        reference: advanceReferenceLabel(rec),
        debit: 0,
        credit: toAmount(adj.adjustment_amount),
        timestamp: ledgerTimestamp(adj.adjustment_date),
      });
    });

  creditNotes
    .filter((cn) => sameId(cn.customer_id, customer.id))
    .forEach((cn) => {
      entries.push({
        date: dateOnly(cn.issue_date),
        description: `Credit Note (${cn.credit_note_number})`,
        type: 'Credit Note',
        reference: cn.credit_note_number,
        debit: 0,
        credit: toAmount(cn.total_amount),
        timestamp: ledgerTimestamp(cn.issue_date),
      });
    });

  entries.sort((a, b) => a.timestamp - b.timestamp);

  let balance = 0;
  return entries.map((entry, idx) => {
    balance = idx === 0 ? entry.debit : balance + entry.debit - entry.credit;
    return { ...entry, running_balance: Math.round(balance * 100) / 100 };
  });
}

export function buildVendorLedger(vendor, expenses = [], payments = [], debitNotes = []) {
  if (!vendor) return [];

  const vendExpenses = expenses.filter((exp) => sameId(exp.vendor_id, vendor.id));
  const vendPayments = payments.filter(
    (pay) => sameId(pay.vendor_id, vendor.id) || pay.payee === vendor.name
  );
  const entries = [];

  entries.push({
    date: dateOnly(vendor.opening_balance_date) || '2026-04-01',
    description: 'Opening Balance',
    type: 'Opening',
    reference: 'OPEN',
    debit: 0,
    credit: toAmount(vendor.opening_balance),
    timestamp: ledgerTimestamp(vendor.opening_balance_date || '2026-04-01'),
  });

  vendExpenses.forEach((exp) => {
    entries.push({
      date: dateOnly(exp.expense_date),
      description: `Bill / Expense (${exp.expense_number || exp.invoice_number})`,
      type: 'Expense',
      reference: exp.expense_number || exp.invoice_number,
      debit: 0,
      credit: toAmount(exp.total_amount),
      timestamp: ledgerTimestamp(exp.expense_date),
    });
  });

  vendPayments.forEach((pay) => {
    entries.push({
      date: dateOnly(pay.payment_date),
      description: `Payment (${pay.payment_number})${pay.is_advance ? ' — Advance' : ''}`,
      type: 'Payment',
      reference: pay.payment_number,
      debit: toAmount(pay.amount_paid) + toAmount(pay.tds_deducted),
      credit: 0,
      timestamp: ledgerTimestamp(pay.payment_date),
    });
  });

  debitNotes
    .filter((dn) => sameId(dn.vendor_id, vendor.id))
    .forEach((dn) => {
      entries.push({
        date: dateOnly(dn.issue_date),
        description: `Debit Note (${dn.debit_note_number})`,
        type: 'Debit Note',
        reference: dn.debit_note_number,
        debit: toAmount(dn.total_amount),
        credit: 0,
        timestamp: ledgerTimestamp(dn.issue_date),
      });
    });

  entries.sort((a, b) => a.timestamp - b.timestamp);

  let balance = 0;
  return entries.map((entry, idx) => {
    balance = idx === 0 ? entry.credit : balance + entry.credit - entry.debit;
    return { ...entry, running_balance: Math.round(balance * 100) / 100 };
  });
}

export function customerOutstanding(customer, invoices, receipts, creditNotes, advanceAdjustments = []) {
  return invoices
    .filter((inv) => sameId(inv.customer_id, customer.id))
    .reduce((sum, inv) => sum + invoiceOutstandingAmount(inv, receipts, creditNotes, advanceAdjustments), 0);
}

export function vendorOutstanding(vendor, expenses, payments, debitNotes) {
  return expenses
    .filter((exp) => sameId(exp.vendor_id, vendor.id))
    .reduce((sum, exp) => sum + expenseOutstandingAmount(exp, payments, debitNotes), 0);
}
