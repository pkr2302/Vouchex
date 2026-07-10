import { filterRecordsByDateRange } from './taxExport/exportPeriod';

/** Scope taxation tab datasets to the applied reporting period. */
export function scopeTaxDataForPeriod(
  { invoices = [], creditNotes = [], debitNotes = [], expenses = [], receipts = [], payments = [] },
  period = {}
) {
  const from = period?.from;
  const to = period?.to;

  return {
    invoices: filterRecordsByDateRange(
      invoices.filter((inv) => inv.status !== 'Cancelled'),
      from,
      to,
      'issue_date'
    ),
    creditNotes: filterRecordsByDateRange(creditNotes, from, to, 'issue_date'),
    debitNotes: filterRecordsByDateRange(debitNotes, from, to, 'issue_date'),
    expenses: filterRecordsByDateRange(expenses, from, to, 'expense_date'),
    receipts: filterRecordsByDateRange(receipts, from, to, 'payment_date'),
    payments: filterRecordsByDateRange(payments, from, to, 'payment_date'),
  };
}
