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
import { resolveRegisteredState } from '../gstUtils';

const TEMPLATE_URL = '/templates/VouchrIt_Sales_Itemized_Template.xlsx';
const DATA_ROW = 2;

async function loadTemplate() {
  const res = await fetch(TEMPLATE_URL);
  if (!res.ok) throw new Error('VouchrIt template missing. Upload public/templates/VouchrIt_Sales_Itemized_Template.xlsx');
  const ab = await res.arrayBuffer();
  return XLSX.read(ab, { type: 'array', cellDates: true });
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

function round2(n) {
  return Math.round(n * 100) / 100;
}

export async function exportVouchrItWorkbook({
  invoices,
  invoiceItems,
  creditNotes,
  creditNoteItems,
  companyDetails,
}) {
  const wb = await loadTemplate();
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = [];
  const companyState = resolveRegisteredState(companyDetails) || 'Gujarat';

  invoices
    .filter((inv) => inv.status !== 'Cancelled')
    .forEach((inv) => {
      pushInvoiceRows(rows, inv, getInvoiceLines(inv, invoiceItems), companyState, 1);
    });

  (creditNotes || []).forEach((cn) => {
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

  XLSX.utils.sheet_add_aoa(ws, rows, { origin: { r: DATA_ROW, c: 0 } });
  const endRow = DATA_ROW + rows.length;
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: endRow, c: 18 } });

  XLSX.writeFile(wb, `VouchrIt_Sales_${companyDetails.gstin || 'export'}.xlsx`);
}
