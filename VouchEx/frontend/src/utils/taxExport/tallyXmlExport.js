import { toAmount } from '../formatMoney';
import { formatGstDate, getInvoiceLines, getCreditNoteLines } from '../gstFormatHelpers';
import { deriveExportPeriodLabel, vouchexTallyXmlFilename, filterRecordsByDateRange } from './exportPeriod';

function escXml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function ledgerEntry(name, amount, isDeemedPositive) {
  return `
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>${escXml(name)}</LEDGERNAME>
          <ISDEEMEDPOSITIVE>${isDeemedPositive ? 'Yes' : 'No'}</ISDEEMEDPOSITIVE>
          <AMOUNT>${round2(amount)}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>`;
}

function round2(n) {
  return Math.round(toAmount(n) * 100) / 100;
}

function buildSalesVoucher(inv, lines, companyDetails) {
  const date = formatGstDate(inv.issue_date);
  const party = inv.customer_name || 'Customer';
  const total = round2(inv.total_amount);
  const subtotal = round2(inv.subtotal);
  const cgst = round2(inv.cgst ?? 0);
  const sgst = round2(inv.sgst ?? 0);
  const igst = round2(inv.igst ?? 0);

  let inventoryXml = '';
  if (lines.length) {
    lines.forEach((line) => {
      const amt = round2(line.line_total || toAmount(line.quantity) * toAmount(line.unit_price ?? line.rate));
      inventoryXml += `
        <ALLINVENTORYENTRIES.LIST>
          <STOCKITEMNAME>${escXml(line.description || 'Item')}</STOCKITEMNAME>
          <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
          <RATE>${round2(line.unit_price ?? line.rate)}</RATE>
          <ACTUALQTY>${toAmount(line.quantity) || 1} Nos</ACTUALQTY>
          <AMOUNT>${amt}</AMOUNT>
        </ALLINVENTORYENTRIES.LIST>`;
    });
  }

  return `
      <TALLYMESSAGE xmlns:UDF="TallyUDF">
        <VOUCHER VCHTYPE="Sales" ACTION="Create" OBJVIEW="Invoice Voucher View">
          <DATE>${date}</DATE>
          <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
          <VOUCHERNUMBER>${escXml(inv.invoice_number)}</VOUCHERNUMBER>
          <PARTYLEDGERNAME>${escXml(party)}</PARTYLEDGERNAME>
          <PERSISTEDVIEW>Invoice Voucher View</PERSISTEDVIEW>
          ${inventoryXml}
          ${ledgerEntry(party, -total, true)}
          ${ledgerEntry('Sales', subtotal, false)}
          ${cgst > 0 ? ledgerEntry('Output CGST', -cgst, true) : ''}
          ${sgst > 0 ? ledgerEntry('Output SGST', -sgst, true) : ''}
          ${igst > 0 ? ledgerEntry('Output IGST', -igst, true) : ''}
          <NARRATION>${escXml(`vouchex export — ${inv.invoice_number}`)}</NARRATION>
        </VOUCHER>
      </TALLYMESSAGE>`;
}

function buildCreditNoteVoucher(cn, lines, companyDetails) {
  const date = formatGstDate(cn.issue_date);
  const party = cn.customer_name || 'Customer';
  const total = round2(cn.total_amount);

  return `
      <TALLYMESSAGE xmlns:UDF="TallyUDF">
        <VOUCHER VCHTYPE="Credit Note" ACTION="Create">
          <DATE>${date}</DATE>
          <VOUCHERTYPENAME>Credit Note</VOUCHERTYPENAME>
          <VOUCHERNUMBER>${escXml(cn.credit_note_number)}</VOUCHERNUMBER>
          <PARTYLEDGERNAME>${escXml(party)}</PARTYLEDGERNAME>
          ${ledgerEntry(party, total, false)}
          ${ledgerEntry('Sales', -round2(cn.subtotal), true)}
          <NARRATION>${escXml(`Credit Note — ${cn.reason || ''}`)}</NARRATION>
        </VOUCHER>
      </TALLYMESSAGE>`;
}

export function exportTallyXml({
  invoices,
  invoiceItems,
  creditNotes,
  creditNoteItems,
  companyDetails,
  periodStart = null,
  periodEnd = null,
}) {
  let scopedInvoices = (invoices || []).filter((inv) => inv.status !== 'Cancelled');
  let scopedCreditNotes = creditNotes || [];
  if (periodStart || periodEnd) {
    scopedInvoices = filterRecordsByDateRange(scopedInvoices, periodStart, periodEnd, 'issue_date');
    scopedCreditNotes = filterRecordsByDateRange(scopedCreditNotes, periodStart, periodEnd, 'issue_date');
  }

  const period = deriveExportPeriodLabel(scopedInvoices, scopedCreditNotes);
  const company = companyDetails.name || 'vouchex Company';
  let body = '';

  scopedInvoices.forEach((inv) => {
    body += buildSalesVoucher(inv, getInvoiceLines(inv, invoiceItems), companyDetails);
  });

  scopedCreditNotes.forEach((cn) => {
    body += buildCreditNoteVoucher(cn, getCreditNoteLines(cn, creditNoteItems || []), companyDetails);
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${escXml(company)}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        ${body}
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;

  const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = vouchexTallyXmlFilename(period);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
