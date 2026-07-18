import { bifurcateStoredTax, isIntraState, resolveRegisteredState } from '../gstUtils';
import { toAmount } from '../formatMoney';
import {
  formatGstJsonDate,
  formatPlaceOfSupplyCode,
  formatHsn6,
  formatGstUqc,
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

/** Align with GST Returns Offline Tool 3.2.x schema family. */
const GSTR1_JSON_VERSION = 'GST3.2.2';

/** Table-12 HSN B2B/B2C bifurcation applies from May 2025 return period (fp MMYYYY). */
function shouldUseHsnBifurcation(fp) {
  if (!fp || String(fp).length < 6) return true;
  const mm = parseInt(String(fp).slice(0, 2), 10);
  const yyyy = parseInt(String(fp).slice(2), 10);
  if (!mm || !yyyy) return true;
  return yyyy > 2025 || (yyyy === 2025 && mm >= 5);
}

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

/** GSTN rejects special characters in document numbers in some schema versions. */
function sanitizeDocNo(value) {
  return String(value || '')
    .trim()
    .replace(/[^\w\-\/]/g, '')
    .slice(0, 16);
}

function requirePos(stateName, contextLabel) {
  const pos = formatPlaceOfSupplyCode(stateName);
  if (!/^\d{2}$/.test(pos)) {
    throw new Error(
      `Invalid Place of Supply for ${contextLabel}. Set a valid Indian state (2-digit GST state code required for portal JSON).`
    );
  }
  return pos;
}

function buildItmDet(bucket) {
  const det = {
    rt: roundGst(bucket.rate),
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
      const itms = buildItms(invoiceRateBuckets(inv, invoiceItems, companyState));
      if (!itms.length) return;

      const invEntry = {
        inum: sanitizeDocNo(inv.invoice_number),
        idt: formatGstJsonDate(inv.issue_date),
        val: roundGst(inv.total_amount),
        pos: requirePos(inv.place_of_supply, `invoice ${inv.invoice_number}`),
        rchrg: 'N',
        inv_typ: 'R',
        itms,
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
      const pos = requirePos(inv.place_of_supply, `invoice ${inv.invoice_number}`);
      groupLinesByRate(getInvoiceLines(inv, invoiceItems), inv, companyState)
        .filter((b) => b.mechanism !== 'ECO')
        .forEach((b) => {
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
      rt: roundGst(a.rt),
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
      const pos = requirePos(inv.place_of_supply, `invoice ${inv.invoice_number}`);
      const buckets = groupLinesByRate(getInvoiceLines(inv, invoiceItems), inv, companyState).filter(
        (b) => b.mechanism !== 'ECO'
      );
      if (!buckets.length) return;

      const invEntry = {
        inum: sanitizeDocNo(inv.invoice_number),
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
      nt_num: sanitizeDocNo(cn.credit_note_number),
      nt_dt: formatGstJsonDate(cn.issue_date),
      pos: requirePos(cn.place_of_supply || companyState, `credit note ${cn.credit_note_number}`),
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
      nt_num: sanitizeDocNo(cn.credit_note_number),
      nt_dt: formatGstJsonDate(cn.issue_date),
      pos: requirePos(cn.place_of_supply || companyState, `credit note ${cn.credit_note_number}`),
      val: roundGst(cn.total_amount),
      itms: buildItms(creditNoteBuckets(cn, creditNoteItems, companyState)),
    }));
}

function buildExpJson(invoices, companyState) {
  const byType = new Map();

  invoices
    .filter((inv) => inv.status !== 'Cancelled' && isExportInvoice(inv))
    .forEach((inv) => {
      const expTyp = inv.export_type === 'WOPAY' || inv.export_treatment === 'LUT' || inv.export_treatment === 'Bond'
        ? 'WOPAY'
        : (inv.export_type || 'WPAY');
      const tax = bifurcateStoredTax(inv, inv.place_of_supply, companyState);
      const rate = toAmount(inv.tax_rate) || (tax.igst > 0 ? 18 : 0);
      const invEntry = {
        inum: sanitizeDocNo(inv.invoice_number),
        idt: formatGstJsonDate(inv.issue_date),
        val: roundGst(inv.total_amount),
        itms: [
          {
            txval: roundGst(inv.subtotal),
            rt: roundGst(rate),
            iamt: roundGst(tax.igst),
          },
        ],
      };

      // Omit empty shipping-bill fields — empty strings fail GSTN schema validation
      const port = String(inv.port_code || '').trim();
      const sbnum = inv.shipping_bill_number ? String(inv.shipping_bill_number).trim() : '';
      const sbdt = inv.shipping_bill_date ? formatGstJsonDate(inv.shipping_bill_date) : '';
      if (port) invEntry.sbpcode = port;
      if (sbnum) invEntry.sbnum = sbnum;
      if (sbdt) invEntry.sbdt = sbdt;

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
      if (isExportInvoice(inv)) return !b2bOnly; // exports roll into B2C HSN tab per GSTN advisory
      return b2bOnly ? isB2bInvoice(inv) : isB2cInvoice(inv);
    })
    .forEach((inv) => {
      getInvoiceLines(inv, invoiceItems).forEach((line) => {
        const hsn = formatHsn6(line.hsn_sac);
        if (!hsn) return;
        const rt = roundGst(toAmount(line.tax_rate_override ?? line.tax_rate ?? 18));
        const uqc = formatGstUqc(hsn, line.uom || line.unit || 'NOS');
        const key = `${hsn}|${uqc}|${rt}`;
        if (!agg.has(key)) {
          agg.set(key, {
            hsn_sc: hsn,
            desc: String(line.description || '').slice(0, 30),
            uqc,
            qty: 0,
            txval: 0,
            rt,
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

  const data = [...agg.values()].map((a, idx) => ({
    num: idx + 1,
    hsn_sc: a.hsn_sc,
    desc: a.desc || a.hsn_sc,
    uqc: a.uqc || 'NOS',
    qty: roundGst(a.qty),
    txval: roundGst(a.txval),
    iamt: roundGst(a.iamt),
    camt: roundGst(a.camt),
    samt: roundGst(a.samt),
    csamt: roundGst(a.csamt),
    rt: a.rt,
  }));

  return data;
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
            from: sanitizeDocNo(sorted[0].invoice_number),
            to: sanitizeDocNo(sorted[sorted.length - 1].invoice_number),
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
  // Compact JSON — matches Offline Tool output and avoids schema edge cases with formatting
  const blob = new Blob([JSON.stringify(payload)], { type: 'application/json;charset=utf-8' });
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
  const gstin = (companyDetails.gstin || '').trim().toUpperCase();

  if (!isValidGstin(gstin)) {
    throw new Error('Company GSTIN must be a valid 15-character GSTIN for GSTR-1 portal JSON.');
  }

  const payload = {
    gstin,
    fp,
    version: GSTR1_JSON_VERSION,
    hash: 'hash',
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
  const hsnB2c = aggregateHsn(periodInvoices, invoiceItems, false);

  // GSTN schema (post Table-12 bifurcation): HSN lives under root "hsn" with
  // hsn_b2b / hsn_b2c as ARRAYS — not top-level keys and not { data: [] }.
  // Ref: GSTN Save GSTR-1 API sample + Offline Tool 3.2.x
  const useHsnBifurcation = shouldUseHsnBifurcation(fp);
  if (useHsnBifurcation) {
    const hsn = {};
    if (hsnB2b.length) hsn.hsn_b2b = hsnB2b;
    if (hsnB2c.length) hsn.hsn_b2c = hsnB2c;
    if (Object.keys(hsn).length) payload.hsn = hsn;
  } else {
    const combined = [...hsnB2b, ...hsnB2c].map((row, idx) => ({ ...row, num: idx + 1 }));
    if (combined.length) payload.hsn = { data: combined };
  }

  // GSTN Phase-3: if B2B invoices exist, Table-12 B2B HSN cannot be empty
  if (b2b.length && !hsnB2b.length) {
    throw new Error(
      'GSTR-1 JSON: B2B invoices exist but HSN summary (Table 12 B2B) is empty. Add 4- or 6-digit HSN/SAC on B2B line items, then export again.'
    );
  }

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
