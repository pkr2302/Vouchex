import * as XLSX from 'xlsx';
import { toAmount } from '../formatMoney';
import {
  formatVouchrItDate,
  getInvoiceLines,
  getCreditNoteLines,
  lineTaxSplit,
  formatHsn6,
} from '../gstFormatHelpers';
import { resolveRegisteredState } from '../gstUtils';
import { deriveExportPeriodLabel, vouchexTallyXlsxFilename, filterRecordsByDateRange } from './exportPeriod';

const HEADERS = [
  'GSTIN (URC/GSTN)',
  'Party Name',
  'Invoice Number',
  'Invoice Date (dd-mm-yyyy)',
  'Place of Supply',
  'Stock Item Description',
  'HSN',
  'Rate',
  'Qty',
  'UOM',
  'GST %',
  'Taxable',
  'IGST',
  'CGST',
  'SGST',
  'Cess',
  'VAT',
  'TCS',
  'Narrations',
];

function round2(n) {
  return Math.round(toAmount(n) * 100) / 100;
}

function pushInvoiceRows(rows, inv, lines, companyState, sign = 1) {
  if (lines.length === 0) {
    rows.push([
      inv.gstin && inv.gstin !== 'NIL' ? inv.gstin : '',
      inv.customer_name,
      inv.invoice_number,
      formatVouchrItDate(inv.issue_date),
      inv.place_of_supply || '',
      inv.customer_name || 'Supply',
      '',
      '',
      1,
      'Nos',
      18,
      round2(sign * toAmount(inv.subtotal)),
      round2(sign * toAmount(inv.igst)),
      round2(sign * toAmount(inv.cgst)),
      round2(sign * toAmount(inv.sgst)),
      '',
      '',
      '',
      inv.po_number || '',
    ]);
    return;
  }

  lines.forEach((line) => {
    const t = lineTaxSplit(line, inv, companyState);
    rows.push([
      inv.gstin && inv.gstin !== 'NIL' ? inv.gstin : '',
      inv.customer_name,
      inv.invoice_number,
      formatVouchrItDate(inv.issue_date),
      inv.place_of_supply || '',
      line.description || line.item_detail || 'Item',
      formatHsn6(line.hsn_sac),
      round2(toAmount(line.unit_price ?? line.rate)),
      round2(toAmount(line.quantity) || 1),
      line.unit || 'Nos',
      t.rate,
      round2(sign * t.taxable),
      round2(sign * t.igst),
      round2(sign * t.cgst),
      round2(sign * t.sgst),
      '',
      '',
      '',
      line.item_detail || inv.po_number || '',
    ]);
  });
}

export async function exportTallySalesWorkbook({
  invoices,
  invoiceItems,
  creditNotes,
  creditNoteItems,
  companyDetails,
  periodStart = null,
  periodEnd = null,
}) {
  const rows = [];
  const companyState = resolveRegisteredState(companyDetails) || 'Gujarat';

  let scopedInvoices = (invoices || []).filter((inv) => inv.status !== 'Cancelled');
  let scopedCreditNotes = creditNotes || [];
  if (periodStart || periodEnd) {
    scopedInvoices = filterRecordsByDateRange(scopedInvoices, periodStart, periodEnd, 'issue_date');
    scopedCreditNotes = filterRecordsByDateRange(scopedCreditNotes, periodStart, periodEnd, 'issue_date');
  }

  scopedInvoices.forEach((inv) => {
    pushInvoiceRows(rows, inv, getInvoiceLines(inv, invoiceItems), companyState, 1);
  });

  scopedCreditNotes.forEach((cn) => {
    const pseudoInv = {
      gstin: cn.gstin,
      customer_name: cn.customer_name,
      invoice_number: cn.credit_note_number,
      issue_date: cn.issue_date,
      place_of_supply: cn.place_of_supply,
      po_number: cn.reason,
    };
    pushInvoiceRows(rows, pseudoInv, getCreditNoteLines(cn, creditNoteItems || []), companyState, -1);
  });

  const aoa = [
    [
      'VouchEx — Sales voucher import (itemized). Dates: dd-mm-yyyy. Do not alter header row.',
    ],
    HEADERS,
    ...rows,
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = HEADERS.map((h) => ({ wch: Math.min(24, Math.max(10, h.length + 1)) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sales');

  const period = deriveExportPeriodLabel(scopedInvoices, scopedCreditNotes);
  XLSX.writeFile(wb, vouchexTallyXlsxFilename(period));
}
