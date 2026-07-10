import { sumField, toAmount, sameId } from './formatMoney';
import {
  invoiceOutstandingAmount,
  expenseOutstandingAmount,
  portalToday,
} from './accountingHelpers';

export const DASHBOARD_REFERENCE_DATE = portalToday();

export const DASHBOARD_PANEL_IDS = [
  'invoices-receivables',
  'expense-breakdown',
  'profit-loss',
  'sales-trajectory',
  'financial-analytics',
];

export function formatRupee(value) {
  const { formatINR } = require('./formatMoney');
  return `₹${formatINR(value)}`;
}
