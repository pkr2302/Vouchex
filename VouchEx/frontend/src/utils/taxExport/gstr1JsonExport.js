import { bifurcateStoredTax, isIntraState, resolveRegisteredState } from '../gstUtils';
import { toAmount } from '../formatMoney';
import {
  formatGstJsonDate,
  formatPlaceOfSupplyCode,
  formatHsn6,
  getInvoiceLines,
  getCreditNoteLines,
  groupLinesByRate,
  isB2bInvoice,
  isB2cInvoice,
  isB2clInvoice,
  isExportInvoice,
  isValidGstin,
  roundGst,
} from '../gstFormatHelpers';
import {
  deriveExportPeriodLabel,
  deriveSingleFilingPeriod,
  filterRecordsByDateRange,
  gstr1PortalJsonFilename,
} from './exportPeriod';

const GSTR1_JSON_VERSION = 'GST3.2.2';

function filterByFilingPeriod(records, fp) {
  if (!fp || fp.length < 6) return records;
  const mm = parseInt(fp.slice(0, 2), 10);
  const yyyy = parseInt(fp.slice(2), 10);
  return records.filter((r) => {
    const d = new Date(r.issue_date);
    if (Number.isNaN(d.getTime())) return true;
    return d.getMonth() + 1 === mm && d.getFullYear() === yyyy;
  });
}

function buildItmDet(bucket) {
  const det = {
    rt: bucket.rate,
    txval: roundGst(bucket.taxable),
  };
  if (bucket.igst > 0) {
    det.iamt = roundGst(bucket.igst);
  } else {
    det.camt = roundGst(bucket.cgst);
    det.samt = roundGst(bucket.sgst);
  }
  if (bucket.cess > 0) det.csamt = roundGst(bucket.cess);
  return det;
}

function buildItms(buckets) {
  return buckets.map((b, idx) => ({
    num: idx + 1,
    itm_det: buildItmDet(b),
  }));
}

function invoiceRateBuckets(inv, invoiceItems, companyState) {
  const lines = getInvoiceLines(inv, invoiceItems);
  const buckets = groupLinesByRate(lines, inv, companyState).filter((b) => b.mechanism !== 'ECO');
  if (buckets.length > 0) return buckets;

  const tax = bifurcateStoredTax(inv, inv.place_of_supply, companyState);
  const sub = toAmount(inv.subtotal);
  const rate =
    sub > 0
      ? roundGst(((tax.cgst + tax.sgst + tax.igst) / sub) * 100)
      : toAmount(inv.tax_rate) || 18;
  return [
    {
      rate,
      taxable: toAmount(inv.subtotal),
      cess: 0,
      cgst: tax.cgst,
      sgst: tax.sgst,
      igst: tax.igst,
    },
  ];
}

function buildB2bJson(invoices, invoiceItems, companyState) {
  const byCtin = new Map();

  invoices
    .filter((inv) => inv.status !== 'Cancelled' && isB2bInvoice(inv) && isValidGstin(inv.gstin) && !isExportInvoice(inv))
    .forEach((inv) => {
      const ctin = String(inv.gstin || '').trim().toUpperCase();

      const invEntry = {
        inum: String(inv.invoice_number),
        idt: formatGstJsonDate(inv.issue_date),
        val: roundGst(inv.total_amount),
        pos: formatPlaceOfSupplyCode(inv.place_of_supply),
        rchrg: 'N',
        inv_typ: 'R',
        itms: buildItms(invoiceRateBuckets(inv, invoiceItems, companyState)),
      };

      if (!byCtin.has(ctin)) byCtin.set(ctin, []);
      byCtin.get(ctin).push(invEntry);
    });

  return [...byCtin.entries()].map(([ctin, inv]) => ({ ctin, inv }));
}

function buildB2csJson(invoices, invoiceItems, companyState) {
  const agg = new Map();

  invoices
    .filter((inv) => inv.status !== 'Cancelled' && isB2cInvoice(inv) && !isExportInvoice(inv) && !isB2clInvoice(inv, companyState))
    .forEach((inv) => {
      groupLinesByRate(getInvoiceLines(inv, invoiceItems), inv, companyState)
        .filter((b) => b.mechanism !== 'ECO')
        .forEach((b) => {
          const pos = formatPlaceOfSupplyCode(inv.place_of_supply);
          const sply_ty = isIntraState(inv.place_of_supply, companyState) ? 'INTRA' : 'INTER';
          const key = `${pos}|${b.rate}|${sply_ty}`;
          if (!agg.has(key)) {
            agg.set(key, {
              sply_ty,
              typ: 'OE',
              pos,
              rt: b.rate,
              taxable: 0,
              cgst: 0,
              sgst: 0,
              igst: 0,
              cess: 0,
            });
          }
          const a = agg.get(key);
          a.taxable += b.taxable;
          a.cgst += b.cgst;
          a.sgst += b.sgst;
          a.igst += b.igst;
          a.cess += b.cess;
        });
    });

  return [...agg.values()].map((a) => {
    const row = {
      sply_ty: a.sply_ty,
      typ: a.typ,
      pos: a.pos,
      rt: a.rt,
      txval: roundGst(a.taxable),
    };
    if (a.sply_ty === 'INTER') row.iamt = roundGst(a.igst);
    else {
      row.camt = roundGst(a.cgst);
      row.samt = roundGst(a.sgst);
    }
    if (a.cess > 0) row.csamt = roundGst(a.cess);
    return row;
  });
}

function buildB2clJson(invoices, invoiceItems, companyState) {
  const byPos = new Map();

  invoices
    .filter((inv) => isB2clInvoice(inv, companyState))
    .forEach((inv) => {
      const pos = formatPlaceOfSupplyCode(inv.place_of_supply);
      const buckets = groupLinesByRate(getInvoiceLines(inv, invoiceItems), inv, companyState).filter(
        (b) => b.mechanism !== 'ECO'
      );
      if (!buckets.length) return;

      const invEntry = {
        inum: String(inv.invoice_number),
        idt: formatGstJsonDate(inv.issue_date),
        val: roundGst(inv.total_amount),
        itms: buildItms(buckets),
      };

      if (!byPos.has(pos)) byPos.set(pos, []);
      byPos.get(pos).push(invEntry);
    });

  return [...byPos.entries()].map(([pos, inv]) => ({ pos, inv }));
}

function creditNoteBuckets(cn, creditNoteItems, companyState) {
  const lines = getCreditNoteLines(cn, creditNoteItems);
  const buckets = groupLinesByRate(
    lines.map((l) => ({ ...l, rate: l.rate ?? l.unit_price, quantity: l.quantity })),
    { place_of_supply: cn.place_of_supply || companyState },
    companyState
  );
  if (buckets.length) return buckets;

  const tax = bifurcateStoredTax(cn, cn.place_of_supply || companyState, companyState);
  const rate =
    tax.igst > 0
      ? 18
      : toAmount(cn.subtotal) > 0
        ? roundGst(((tax.cgst + tax.sgst) / toAmount(cn.subtotal)) * 100)
        : 18;
  return [
    {
      rate,
      taxable: toAmount(cn.subtotal),
      cess: 0,
      cgst: tax.cgst,
      sgst: tax.sgst,
      igst: tax.igst,
    },
  ];
}

function buildCdnrJson(creditNotes, creditNoteItems, companyState) {
  const byCtin = new Map();

  creditNotes.forEach((cn) => {
    const ctin = String(cn.gstin || '').trim().toUpperCase();
    if (!isValidGstin(ctin)) return;

    const ntEntry = {
      ntty: 'C',
      nt_num: String(cn.credit_note_number),
      nt_dt: formatGstJsonDate(cn.issue_date),
      pos: formatPlaceOfSupplyCode(cn.place_of_supply || companyState),
      rchrg: 'N',
      inv_typ: 'R',
      val: roundGst(cn.total_amount),
      itms: buildItms(creditNoteBuckets(cn, creditNoteItems, companyState)),
    };

    if (!byCtin.has(ctin)) byCtin.set(ctin, []);
    byCtin.get(ctin).push(ntEntry);
  });

  return [...byCtin.entries()].map(([ctin, nt]) => ({ ctin, nt }));
}

function buildCdnurJson(creditNotes, creditNoteItems, companyState) {
  return creditNotes
    .filter((cn) => !isValidGstin(cn.gstin))
    .map((cn) => ({
      typ: 'B2CL',
      ntty: 'C',
      nt_num: String(cn.credit_note_number),
      nt_dt: formatGstJsonDate(cn.issue_date),
      pos: formatPlaceOfSupplyCode(cn.place_of_supply || companyState),
      val: roundGst(cn.total_amount),
      itms: buildItms(creditNoteBuckets(cn, creditNoteItems, companyState)),
    }));
}

function buildExpJson(invoices, companyState) {
  const byType = new Map();

  invoices
    .filter((inv) => inv.status !== 'Cancelled' && isExportInvoice(inv))
    .forEach((inv) => {
      const expTyp = inv.export_type || 'WPAY';
      const tax = bifurcateStoredTax(inv, inv.place_of_supply, companyState);
      const rate = toAmount(inv.tax_rate) || (tax.igst > 0 ? 18 : 0);
      const invEntry = {
        inum: String(inv.invoice_number),
        idt: formatGstJsonDate(inv.issue_date),
        val: roundGst(inv.total_amount),
        sbpcode: inv.port_code || '',
        sbnum: inv.shipping_bill_number ? String(inv.shipping_bill_number) : '',
        sbdt: inv.shipping_bill_date ? formatGstJsonDate(inv.shipping_bill_date) : '',
        itms: [
          {
            txval: roundGst(inv.subtotal),
            rt: rate,
            iamt: roundGst(tax.igst),
            csamt: 0,
          },
        ],
      };

      if (!byType.has(expTyp)) byType.set(expTyp, []);
      byType.get(expTyp).push(invEntry);
    });

  return [...byType.entries()].map(([exp_typ, inv]) => ({ exp_typ, inv }));
}

function aggregateHsn(invoices, invoiceItems, b2bOnly) {
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
            hsn_sc: hsn,
            desc: line.description || '',
            uqc: 'NOS',
            qty: 0,
            txval: 0,
            rt: toAmount(line.tax_rate_override ?? 18),
            iamt: 0,
            camt: 0,
            samt: 0,
            csamt: 0,
          });
        }
        const a = agg.get(key);
        const qty = toAmount(line.quantity) || 1;
        const taxable = toAmount(line.line_total) || qty * toAmount(line.unit_price ?? line.rate);
        a.qty += qty;
        a.txval += taxable;
        a.iamt += toAmount(line.igst);
        a.camt += toAmount(line.cgst);
        a.samt += toAmount(line.sgst);
      });
    });

  const data = [...agg.values()].map((a, idx) => {
    const row = {
      num: idx + 1,
      hsn_sc: a.hsn_sc,
      desc: a.desc,
      uqc: a.uqc,
      qty: roundGst(a.qty),
      txval: roundGst(a.txval),
      rt: a.rt,
    };
    if (a.iamt > 0) row.iamt = roundGst(a.iamt);
    if (a.camt > 0) row.camt = roundGst(a.camt);
    if (a.samt > 0) row.samt = roundGst(a.samt);
    if (a.csamt > 0) row.csamt = roundGst(a.csamt);
    return row;
  });

  return data.length ? { data } : undefined;
}

function buildDocIssueJson(invoices) {
  const active = invoices.filter((inv) => inv.status !== 'Cancelled');
  if (!active.length) return undefined;

  const sorted = [...active].sort((a, b) => String(a.invoice_number).localeCompare(String(b.invoice_number)));
  return {
    doc_det: [
      {
        doc_num: 1,
        docs: [
          {
            num: 1,
            from: String(sorted[0].invoice_number),
            to: String(sorted[sorted.length - 1].invoice_number),
            totnum: sorted.length,
            cancel: invoices.filter((inv) => inv.status === 'Cancelled').length,
            net_issue: active.length,
          },
        ],
      },
    ],
  };
}

function computeGrandTotal(invoices, creditNotes) {
  const sales = invoices
    .filter((inv) => inv.status !== 'Cancelled')
    .reduce((s, inv) => s + toAmount(inv.total_amount), 0);
  const credits = (creditNotes || []).reduce((s, cn) => s + toAmount(cn.total_amount), 0);
  return roundGst(Math.max(0, sales - credits));
}

function downloadJson(payload, filename) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function buildGstr1PortalJson({
  invoices,
  invoiceItems,
  creditNotes,
  creditNoteItems,
  companyDetails,
  filingPeriod,
}) {
  const companyState = resolveRegisteredState(companyDetails) || 'Gujarat';
  const fp = filingPeriod || deriveSingleFilingPeriod(invoices, creditNotes || []);
  const periodInvoices = filterByFilingPeriod(invoices, fp);
  const periodCreditNotes = filterByFilingPeriod(creditNotes || [], fp);

  const payload = {
    version: GSTR1_JSON_VERSION,
    gstin: (companyDetails.gstin || '').trim().toUpperCase(),
    fp,
    gt: computeGrandTotal(periodInvoices, periodCreditNotes),
    cur_gt: computeGrandTotal(periodInvoices, periodCreditNotes),
  };

  const b2b = buildB2bJson(periodInvoices, invoiceItems, companyState);
  if (b2b.length) payload.b2b = b2b;

  const b2cs = buildB2csJson(periodInvoices, invoiceItems, companyState);
  if (b2cs.length) payload.b2cs = b2cs;

  const b2cl = buildB2clJson(periodInvoices, invoiceItems, companyState);
  if (b2cl.length) payload.b2cl = b2cl;

  const cdnr = buildCdnrJson(periodCreditNotes, creditNoteItems || [], companyState);
  if (cdnr.length) payload.cdnr = cdnr;

  const cdnur = buildCdnurJson(periodCreditNotes, creditNoteItems || [], companyState);
  if (cdnur.length) payload.cdnur = cdnur;

  const exp = buildExpJson(periodInvoices, companyState);
  if (exp.length) payload.exp = exp;

  const hsnB2b = aggregateHsn(periodInvoices, invoiceItems, true);
  if (hsnB2b) payload.hsn_b2b = hsnB2b;

  const hsnB2c = aggregateHsn(periodInvoices, invoiceItems, false);
  if (hsnB2c) payload.hsn_b2c = hsnB2c;

  const doc_issue = buildDocIssueJson(periodInvoices);
  if (doc_issue) payload.doc_issue = doc_issue;

  return payload;
}

export async function exportGstr1OfflineJson(exportData) {
  const {
    invoices,
    invoiceItems,
    creditNotes,
    creditNoteItems,
    companyDetails,
    periodStart = null,
    periodEnd = null,
  } = exportData;

  let scopedInvoices = invoices;
  let scopedCreditNotes = creditNotes || [];
  if (periodStart || periodEnd) {
    scopedInvoices = filterRecordsByDateRange(invoices, periodStart, periodEnd, 'issue_date');
    scopedCreditNotes = filterRecordsByDateRange(scopedCreditNotes, periodStart, periodEnd, 'issue_date');
  }

  const fullPeriod = deriveExportPeriodLabel(scopedInvoices, scopedCreditNotes);
  const fp = deriveSingleFilingPeriod(scopedInvoices, scopedCreditNotes, periodStart);

  if (fullPeriod.includes('-')) {
    console.warn(
      `VouchEx GSTR-1 JSON: data spans multiple return periods (${fullPeriod}). Export uses period ${fp}. Narrow the taxation date filter to one month.`
    );
  }

  if (!companyDetails?.gstin) {
    throw new Error('Company GSTIN is required for GSTR-1 JSON export. Add it in Company Settings.');
  }

  const payload = buildGstr1PortalJson({
    invoices: scopedInvoices,
    invoiceItems,
    creditNotes: scopedCreditNotes,
    creditNoteItems,
    companyDetails,
    filingPeriod: fp,
  });

  const filename = gstr1PortalJsonFilename(fp, companyDetails.gstin);
  downloadJson(payload, filename);
  return { filename, filingPeriod: fp, multiPeriod: fullPeriod.includes('-') };
}
