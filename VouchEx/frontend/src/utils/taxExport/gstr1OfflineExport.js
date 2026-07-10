import * as XLSX from 'xlsx';
import { bifurcateStoredTax, resolveRegisteredState } from '../gstUtils';
import { toAmount } from '../formatMoney';
import {
  formatGstDate,
  formatPlaceOfSupply,
  formatHsn6,
  getInvoiceLines,
  getCreditNoteLines,
  groupLinesByRate,
  isB2bInvoice,
  isB2cInvoice,
  isExportInvoice,
  isEcomLine,
  roundGst,
} from '../gstFormatHelpers';
import { deriveExportPeriodLabel, vouchexGstr1Filename, filterRecordsByDateRange } from './exportPeriod';

const SHEET_SPECS = {
  b2b: {
    summary: 'Summary For B2B (4A, 4B)',
    headers: [
      'GSTIN/UIN of Recipient',
      'Receiver Name',
      'Invoice Number',
      'Invoice date',
      'Invoice Value',
      'Place Of Supply',
      'Reverse Charge',
      'Applicable % of Tax Rate',
      'Invoice Type',
      'E-Commerce GSTIN',
      'Rate',
      'Taxable Value',
      'Cess Amount',
    ],
  },
  b2cs: {
    summary: 'Summary For B2CS (7)',
    headers: [
      'Type',
      'Place Of Supply',
      'Applicable % of Tax Rate',
      'Rate',
      'Taxable Value',
      'Cess Amount',
      'E-Commerce GSTIN',
    ],
  },
  b2cl: {
    summary: 'Summary For B2CL',
    headers: [
      'Invoice Number',
      'Invoice date',
      'Invoice Value',
      'Place Of Supply',
      'Applicable % of Tax Rate',
      'Rate',
      'Taxable Value',
      'Cess Amount',
      'E-Commerce GSTIN',
    ],
  },
  cdnr: {
    summary: 'Summary For CDNR (9B - Registered)',
    headers: [
      'GSTIN/UIN of Recipient',
      'Receiver Name',
      'Note Number',
      'Note Date',
      'Note Type',
      'Place Of Supply',
      'Reverse Charge',
      'Note Supply Type',
      'Note Value',
      'Applicable % of Tax Rate',
      'Rate',
      'Taxable Value',
      'Cess Amount',
    ],
  },
  cdnur: {
    summary: 'Summary For CDNUR (9B - Unregistered)',
    headers: [
      'UR Type',
      'Note Number',
      'Note Date',
      'Note Type',
      'Place Of Supply',
      'Note Value',
      'Applicable % of Tax Rate',
      'Rate',
      'Taxable Value',
      'Cess Amount',
    ],
  },
  'hsn (b2b)': {
    summary: 'Summary For HSN (B2B)',
    headers: [
      'HSN',
      'Description',
      'UQC',
      'Total Quantity',
      'Total Value',
      'Taxable Value',
      'Rate',
      'Integrated Tax Amount',
      'Central Tax Amount',
      'State/UT Tax Amount',
      'Cess Amount',
    ],
  },
  'hsn (b2c)': {
    summary: 'Summary For HSN (B2C)',
    headers: [
      'HSN',
      'Description',
      'UQC',
      'Total Quantity',
      'Total Value',
      'Taxable Value',
      'Rate',
      'Integrated Tax Amount',
      'Central Tax Amount',
      'State/UT Tax Amount',
      'Cess Amount',
    ],
  },
  docs: {
    summary: 'Summary For Documents Issued',
    headers: ['Nature of Document', 'Sr. No. From', 'Sr. No. To', 'Total Number', 'Cancelled'],
  },
  exp: {
    summary: 'Summary For EXP (6A)',
    headers: [
      'Export Type',
      'Invoice Number',
      'Invoice date',
      'Invoice Value',
      'Port Code',
      'Shipping Bill Number',
      'Shipping Bill Date',
      'Rate',
      'Taxable Value',
      'Cess Amount',
    ],
  },
  exemp: {
    summary: 'Summary For Nil / Exempted',
    headers: [
      'Description',
      'Nil Rated Supplies',
      'Exempted Supplies',
      'Non-GST Supplies',
    ],
  },
  'Ecom B2B': {
    summary: 'Summary For E-Commerce B2B',
    headers: [
      'GSTIN of Supplier',
      'Supplier Name',
      'GSTIN of Recipient',
      'Receiver Name',
      'Invoice Number',
      'Invoice date',
      'Invoice Value',
      'Place Of Supply',
      'Supply Type',
      'Rate',
      'Taxable Value',
      'Cess Amount',
    ],
  },
  'Ecom B2C': {
    summary: 'Summary For E-Commerce B2C',
    headers: [
      'GSTIN of Supplier',
      'Supplier Name',
      'Place Of Supply',
      'Rate',
      'Taxable Value',
      'Cess Amount',
    ],
  },
  Supeco: {
    summary: 'Summary For Section 52 (Supeco)',
    headers: [
      'GSTIN',
      'Name of Supplier',
      'Liability Type',
      'Gross Value',
      'Return Value',
      'Net Value',
      'Integrated Tax',
      'Central Tax',
      'State/UT Tax',
      'Cess',
    ],
  },
};

function buildB2bRows(invoices, invoiceItems, companyState) {
  const rows = [];
  invoices
    .filter((inv) => inv.status !== 'Cancelled' && isB2bInvoice(inv) && !isExportInvoice(inv))
    .forEach((inv) => {
      const lines = getInvoiceLines(inv, invoiceItems);
      const buckets = groupLinesByRate(lines, inv, companyState).filter((b) => b.mechanism !== 'ECO');
      if (buckets.length === 0) {
        const tax = bifurcateStoredTax(inv, inv.place_of_supply, companyState);
        const rate =
          tax.igst > 0
            ? 18
            : toAmount(inv.subtotal) > 0
              ? roundGst(((tax.cgst + tax.sgst) / toAmount(inv.subtotal)) * 100)
              : 18;
        rows.push([
          inv.gstin || '',
          inv.customer_name,
          inv.invoice_number,
          formatGstExcelDate(inv.issue_date),
          roundGst(inv.total_amount),
          formatPlaceOfSupply(inv.place_of_supply),
          'N',
          '',
          'Regular',
          '',
          rate,
          roundGst(inv.subtotal),
          0,
        ]);
        return;
      }
      buckets.forEach((b) => {
        rows.push([
          inv.gstin || '',
          inv.customer_name,
          inv.invoice_number,
          formatGstDate(inv.issue_date),
          roundGst(inv.total_amount),
          formatPlaceOfSupply(inv.place_of_supply),
          'N',
          '',
          'Regular',
          '',
          b.rate,
          roundGst(b.taxable),
          roundGst(b.cess),
        ]);
      });
    });
  return rows;
}

function buildB2csRows(invoices, invoiceItems, companyState) {
  const agg = new Map();
  invoices
    .filter((inv) => inv.status !== 'Cancelled' && isB2cInvoice(inv) && !isExportInvoice(inv) && !isB2clInvoice(inv, companyState))
    .forEach((inv) => {
      groupLinesByRate(getInvoiceLines(inv, invoiceItems), inv, companyState)
        .filter((b) => b.mechanism !== 'ECO')
        .forEach((b) => {
          const pos = formatPlaceOfSupply(inv.place_of_supply);
          const key = `OE|${pos}|${b.rate}`;
          if (!agg.has(key)) agg.set(key, { type: 'OE', pos, rate: b.rate, taxable: 0, cess: 0, ecom: '' });
          const a = agg.get(key);
          a.taxable += b.taxable;
          a.cess += b.cess;
        });
    });
  return [...agg.values()].map((a) => ['OE', a.pos, '', a.rate, roundGst(a.taxable), roundGst(a.cess), a.ecom]);
}

function buildB2clRows(invoices, invoiceItems, companyState) {
  const rows = [];
  invoices
    .filter((inv) => inv.status !== 'Cancelled' && isB2cInvoice(inv) && toAmount(inv.total_amount) > 250000)
    .forEach((inv) => {
      groupLinesByRate(getInvoiceLines(inv, invoiceItems), inv, companyState).forEach((b) => {
        if (b.mechanism === 'ECO') return;
        rows.push([
          inv.invoice_number,
          formatGstDate(inv.issue_date),
          roundGst(inv.total_amount),
          formatPlaceOfSupply(inv.place_of_supply),
          '',
          b.rate,
          roundGst(b.taxable),
          roundGst(b.cess),
          '',
        ]);
      });
    });
  return rows;
}

function buildCdnrRows(creditNotes, creditNoteItems, companyState) {
  const rows = [];
  creditNotes.forEach((cn) => {
    if (!cn.customer_name) return;
    const origGstin = cn.gstin || '';
    if (!origGstin || origGstin === 'NIL') return;
    const lines = getCreditNoteLines(cn, creditNoteItems);
    const buckets = groupLinesByRate(
      lines.map((l) => ({ ...l, rate: l.rate ?? l.unit_price, quantity: l.quantity })),
      { place_of_supply: cn.place_of_supply || companyState },
      companyState
    );
    const list = buckets.length ? buckets : [{ rate: 18, taxable: cn.subtotal, cess: 0 }];
    list.forEach((b) => {
      rows.push([
        origGstin,
        cn.customer_name,
        cn.credit_note_number,
        formatGstExcelDate(cn.issue_date),
        'C',
        formatPlaceOfSupply(cn.place_of_supply || companyState),
        'N',
        '',
        roundGst(cn.total_amount),
        '',
        b.rate,
        roundGst(b.taxable),
        roundGst(b.cess),
      ]);
    });
  });
  return rows;
}

function buildCdnurRows(creditNotes, creditNoteItems, companyState) {
  const rows = [];
  creditNotes
    .filter((cn) => !cn.gstin || cn.gstin === 'NIL')
    .forEach((cn) => {
      const lines = getCreditNoteLines(cn, creditNoteItems);
      const buckets = groupLinesByRate(
        lines.map((l) => ({ ...l, rate: l.rate ?? l.unit_price })),
        { place_of_supply: cn.place_of_supply || companyState },
        companyState
      );
      const list = buckets.length ? buckets : [{ rate: 18, taxable: cn.subtotal, cess: 0 }];
      list.forEach((b) => {
        rows.push([
          'B2CL',
          cn.credit_note_number,
          formatGstDate(cn.issue_date),
          'C',
          formatPlaceOfSupply(cn.place_of_supply || companyState),
          roundGst(cn.total_amount),
          '',
          b.rate,
          roundGst(b.taxable),
          roundGst(b.cess),
        ]);
      });
    });
  return rows;
}

function buildHsnRows(invoices, invoiceItems, b2bOnly) {
  const agg = new Map();
  invoices
    .filter((inv) => {
      if (inv.status === 'Cancelled') return false;
      return b2bOnly ? isB2bInvoice(inv) : isB2cInvoice(inv);
    })
    .forEach((inv) => {
      getInvoiceLines(inv, invoiceItems).forEach((line) => {
        const hsn = formatHsn6(line.hsn_sac);
        if (!hsn) return;
        const key = hsn;
        if (!agg.has(key)) {
          agg.set(key, {
            hsn,
            desc: line.description || '',
            qty: 0,
            total: 0,
            taxable: 0,
            rate: toAmount(line.tax_rate_override ?? 18),
            igst: 0,
            cgst: 0,
            sgst: 0,
            cess: 0,
          });
        }
        const a = agg.get(key);
        const qty = toAmount(line.quantity) || 1;
        const taxable = toAmount(line.line_total) || qty * toAmount(line.unit_price ?? line.rate);
        a.qty += qty;
        a.taxable += taxable;
        a.total += taxable;
        a.igst += toAmount(line.igst);
        a.cgst += toAmount(line.cgst);
        a.sgst += toAmount(line.sgst);
      });
    });
  return [...agg.values()].map((a) => [
    a.hsn,
    a.desc,
    'NOS-NUMBERS',
    roundGst(a.qty),
    roundGst(a.total),
    roundGst(a.taxable),
    a.rate,
    roundGst(a.igst),
    roundGst(a.cgst),
    roundGst(a.sgst),
    roundGst(a.cess),
  ]);
}

function buildDocsRows(invoices) {
  const active = invoices.filter((inv) => inv.status !== 'Cancelled');
  if (!active.length) return [];
  const sorted = [...active].sort((a, b) => String(a.invoice_number).localeCompare(String(b.invoice_number)));
  return [
    [
      'Invoices for outward supply',
      sorted[0].invoice_number,
      sorted[sorted.length - 1].invoice_number,
      sorted.length,
      0,
    ],
  ];
}

function buildEcomB2bRows(invoices, invoiceItems, companyDetails) {
  const rows = [];
  invoices
    .filter((inv) => inv.status !== 'Cancelled' && isB2bInvoice(inv))
    .forEach((inv) => {
      getInvoiceLines(inv, invoiceItems)
        .filter((line) => isEcomLine(line, inv))
        .forEach((line) => {
          const rate = toAmount(line.tax_rate_override ?? 18);
          const taxable = toAmount(line.line_total) || toAmount(line.quantity) * toAmount(line.unit_price ?? line.rate);
          rows.push([
            companyDetails.gstin || '',
            companyLegalName(companyDetails),
            inv.gstin || '',
            inv.customer_name,
            inv.invoice_number,
            formatGstDate(inv.issue_date),
            roundGst(inv.total_amount),
            formatPlaceOfSupply(inv.place_of_supply),
            'Regular',
            rate,
            roundGst(taxable),
            0,
          ]);
        });
    });
  return rows;
}

function buildEcomB2cRows(invoices, invoiceItems, companyDetails) {
  const agg = new Map();
  invoices
    .filter((inv) => inv.status !== 'Cancelled')
    .forEach((inv) => {
      getInvoiceLines(inv, invoiceItems)
        .filter((line) => isEcomLine(line, inv))
        .forEach((line) => {
          const rate = toAmount(line.tax_rate_override ?? 18);
          const pos = formatPlaceOfSupply(inv.place_of_supply);
          const key = `${pos}|${rate}`;
          if (!agg.has(key)) {
            agg.set(key, { supplier: companyDetails.gstin, name: companyLegalName(companyDetails), pos, rate, taxable: 0 });
          }
          agg.get(key).taxable += toAmount(line.line_total) || toAmount(line.quantity) * toAmount(line.unit_price ?? line.rate);
        });
    });
  return [...agg.values()].map((a) => [
    a.supplier,
    a.name,
    a.pos,
    a.rate,
    roundGst(a.taxable),
    0,
  ]);
}

function buildSupecoRows(invoices, invoiceItems, companyDetails) {
  let gross = 0;
  invoices
    .filter((inv) => inv.status !== 'Cancelled')
    .forEach((inv) => {
      getInvoiceLines(inv, invoiceItems)
        .filter((line) => isEcomLine(line, inv))
        .forEach((line) => {
          gross += toAmount(line.line_total) || 0;
        });
    });
  if (gross <= 0) return [];
  const tax = gross * 0.18;
  return [
    [
      companyDetails.gstin || '',
      companyLegalName(companyDetails),
      'Liable u/s 52',
      roundGst(gross),
      0,
      roundGst(gross),
      roundGst(tax / 2),
      roundGst(tax / 2),
      0,
      0,
    ],
  ];
}

function buildExpRows(invoices) {
  return invoices
    .filter((inv) => inv.status !== 'Cancelled' && isExportInvoice(inv))
    .map((inv) => [
      'WPAY',
      inv.invoice_number,
      formatGstDate(inv.issue_date),
      roundGst(inv.total_amount),
      inv.port_code || '',
      inv.shipping_bill_number || '',
      inv.shipping_bill_date ? formatGstDate(inv.shipping_bill_date) : '',
      toAmount(inv.tax_rate) || 0,
      roundGst(inv.subtotal),
      0,
    ]);
}

function sumTaxable(rows) {
  return rows.reduce((s, row) => {
    const spec = row.length;
    if (spec >= 12) return s + toAmount(row[11]);
    if (spec >= 5) return s + toAmount(row[4] ?? row[3]);
    return s;
  }, 0);
}

function appendGstSheet(wb, sheetName, spec, rows) {
  const taxableTotal = roundGst(sumTaxable(rows));
  const aoa = [
    [spec.summary],
    [
      'Total Records',
      rows.length,
      'Total Taxable Value',
      taxableTotal,
      'Prepared by',
      'VouchEx',
      'Date',
      formatGstDate(new Date().toISOString().slice(0, 10)),
    ],
    [],
    spec.headers,
    ...rows,
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = spec.headers.map((h) => ({ wch: Math.min(28, Math.max(12, String(h).length + 2)) }));
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
}

function buildMasterSheet(companyDetails, period, sectionCounts) {
  const rows = [
    ['VouchEx — GSTR-1 Return Workbook (GSTN Offline Utility Compatible)'],
    [],
    ['GSTIN', companyDetails.gstin || ''],
    ['Legal Name', companyDetails.name || ''],
    ['Trade Name', companyDetails.trade_name || companyDetails.name || ''],
    ['State', resolveRegisteredState(companyDetails) || companyDetails.state || ''],
    ['Return Period (MMYYYY)', period],
    ['Generated On', formatGstDate(new Date().toISOString().slice(0, 10))],
    [],
    ['Section', 'Record Count', 'Remarks'],
    ...Object.entries(sectionCounts).map(([k, v]) => [k, v, v > 0 ? 'Populated' : 'No transactions in period']),
    [],
    ['Note', 'Use this workbook with GST Portal offline tool. Dates are DD-MMM-YYYY. Amounts are 2 decimal places.'],
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 42 }, { wch: 18 }, { wch: 36 }];
  return ws;
}

export async function exportGstr1OfflineWorkbook({
  invoices,
  invoiceItems,
  creditNotes,
  creditNoteItems,
  companyDetails,
  periodStart = null,
  periodEnd = null,
}) {
  let scopedInvoices = invoices;
  let scopedCreditNotes = creditNotes || [];
  if (periodStart || periodEnd) {
    scopedInvoices = filterRecordsByDateRange(invoices, periodStart, periodEnd, 'issue_date');
    scopedCreditNotes = filterRecordsByDateRange(scopedCreditNotes, periodStart, periodEnd, 'issue_date');
  }

  const companyState = resolveRegisteredState(companyDetails) || 'Gujarat';
  const period = deriveExportPeriodLabel(scopedInvoices, scopedCreditNotes);

  const datasets = {
    b2b: buildB2bRows(scopedInvoices, invoiceItems, companyState),
    b2cs: buildB2csRows(scopedInvoices, invoiceItems, companyState),
    b2cl: buildB2clRows(scopedInvoices, invoiceItems, companyState),
    cdnr: buildCdnrRows(scopedCreditNotes, creditNoteItems || [], companyState),
    cdnur: buildCdnurRows(scopedCreditNotes, creditNoteItems || [], companyState),
    'hsn (b2b)': buildHsnRows(scopedInvoices, invoiceItems, true),
    'hsn (b2c)': buildHsnRows(scopedInvoices, invoiceItems, false),
    docs: buildDocsRows(scopedInvoices),
    exp: buildExpRows(scopedInvoices),
    exemp: [],
    'Ecom B2B': buildEcomB2bRows(scopedInvoices, invoiceItems, companyDetails),
    'Ecom B2C': buildEcomB2cRows(scopedInvoices, invoiceItems, companyDetails),
    Supeco: buildSupecoRows(scopedInvoices, invoiceItems, companyDetails),
  };

  const wb = XLSX.utils.book_new();
  const sectionCounts = {};
  Object.entries(datasets).forEach(([name, rows]) => {
    sectionCounts[name] = rows.length;
    appendGstSheet(wb, name, SHEET_SPECS[name], rows);
  });
  XLSX.utils.book_append_sheet(wb, buildMasterSheet(companyDetails, period, sectionCounts), 'master');

  XLSX.writeFile(wb, vouchexGstr1Filename(period));
}
