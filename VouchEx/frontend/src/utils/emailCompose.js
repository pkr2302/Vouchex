import { formatDocumentMoney, toAmount } from './formatMoney';
import { receiptSettledInvoiceLabel, paymentSettledExpenseLabel } from './formatMoney';
import { companyTradeName } from './companyDisplay';
import { bifurcateStoredTax, resolveRegisteredState } from './gstUtils';
import { receiptSettlementTotal, paymentSettlementTotal } from './accountingHelpers';

export function buildInvoiceEmailBody(invoice, company, customer, lineItems = []) {
  const cur = invoice.currency || 'INR';
  const tax = bifurcateStoredTax(invoice, invoice.place_of_supply, resolveRegisteredState(company));
  const fmt = (v) => formatDocumentMoney(v, cur);
  const lines = [
    `Dear ${customer?.name || invoice.customer_name || 'Customer'},`,
    '',
    'Please find below the details of your tax invoice for your records:',
    '',
    `Invoice Number: ${invoice.invoice_number}`,
    `Invoice Date: ${invoice.issue_date || '—'}`,
    ...(invoice.due_date ? [`Due Date: ${invoice.due_date}`] : []),
    `Place of Supply: ${invoice.place_of_supply || '—'}`,
    `Currency: ${cur}`,
    '',
    '--- Amount Summary ---',
    `Taxable Value: ${fmt(invoice.subtotal)}`,
    `CGST: ${fmt(tax.cgst)}`,
    `SGST: ${fmt(tax.sgst)}`,
    `IGST: ${fmt(tax.igst)}`,
    `Total Amount: ${fmt(invoice.total_amount)}`,
    `Status: ${invoice.status}`,
    '',
  ];
  if (lineItems.length > 0) {
    lines.push('--- Line Items ---');
    lineItems.forEach((it, idx) => {
      const qty = it.quantity ?? 1;
      const rate = it.unit_price ?? it.rate ?? 0;
      const total = it.line_total ?? qty * rate;
      lines.push(
        `${idx + 1}. ${it.description || 'Item'} | HSN ${it.hsn_sac || '—'} | Qty ${qty} × ${fmt(rate)} = ${fmt(total)}`
      );
    });
    lines.push('');
  }
  lines.push(
    '--- Billing ---',
    invoice.billing_address || '—',
    '',
    '--- From ---',
    companyTradeName(company) || '',
    `GSTIN: ${company?.gstin || '—'}`,
    company?.address ? `${company.address}, ${company.city || ''}` : '',
    `Contact: ${company?.email || ''} | ${company?.phone || ''}`,
    '',
    'Thank you for your business.',
    '',
    'Regards,',
    companyTradeName(company) || 'VouchEx',
  );
  return lines.join('\n');
}

export function openGmailCompose({ to, subject, body, fromEmail }) {
  const params = new URLSearchParams({
    view: 'cm',
    fs: '1',
    to: to || '',
    su: subject || '',
    body: body || '',
  });

  const email = (fromEmail || '').trim().toLowerCase();
  if (email.includes('@gmail.') || email.includes('@googlemail.')) {
    const authuser = email.split('@')[0];
    if (authuser) params.set('authuser', authuser);
    window.open(`https://mail.google.com/mail/?${params.toString()}`, '_blank', 'noopener,noreferrer');
    return;
  }

  const mailto = `mailto:${encodeURIComponent(to || '')}?subject=${encodeURIComponent(subject || '')}&body=${encodeURIComponent(body || '')}`;
  window.open(mailto, '_blank');
}

export function buildPaymentVoucherEmailBody(payment, company, expenses = []) {
  const cur = payment.currency || 'INR';
  const fmt = (v) => formatDocumentMoney(v, cur);
  const tds = toAmount(payment.tds_deducted);
  const settled = paymentSettlementTotal(payment);
  return [
    'Dear Supplier,',
    '',
    'Please find payment voucher details below:',
    '',
    `Payment No: ${payment.payment_number}`,
    `Date: ${payment.payment_date}`,
    `Payee: ${payment.payee}`,
    ...(payment.is_advance
      ? ['Type: Advance payment']
      : [`Settled Bill: ${paymentSettledExpenseLabel(payment, expenses)}`]),
    `Net Amount Paid: ${fmt(payment.amount_paid)}`,
    ...(tds > 0 ? [`TDS Deducted: ${fmt(tds)}`, `Total Settlement: ${fmt(settled)}`] : []),
    `Mode: ${payment.payment_mode}`,
    `Paid From: ${payment.paid_from || '—'}`,
    `Reference: ${payment.reference_no || '—'}`,
    '',
    'Regards,',
    companyTradeName(company) || '',
  ].join('\n');
}

export function buildReceiptVoucherEmailBody(receipt, company, invoices = []) {
  const cur = receipt.currency || 'INR';
  const fmt = (v) => formatDocumentMoney(v, cur);
  const tds = toAmount(receipt.tds_deducted);
  const disc = toAmount(receipt.discount_allowed);
  const settled = receiptSettlementTotal(receipt);
  return [
    `Dear ${receipt.customer_name || 'Customer'},`,
    '',
    'Please find receipt voucher details below:',
    '',
    `Receipt No: ${receipt.receipt_number}`,
    `Date: ${receipt.payment_date}`,
    ...(receipt.is_advance && !receipt.invoice_id
      ? ['Type: Advance receipt']
      : [`Settled Invoice: ${receiptSettledInvoiceLabel(receipt, invoices)}`]),
    `Net Amount Received: ${fmt(receipt.amount_received)}`,
    ...(tds > 0 ? [`TDS Deducted: ${fmt(tds)}`] : []),
    ...(disc > 0 ? [`Discount Allowed: ${fmt(disc)}`] : []),
    ...(tds > 0 || disc > 0 ? [`Total Settlement: ${fmt(settled)}`] : []),
    `Mode: ${receipt.payment_mode}`,
    `Deposited To: ${receipt.deposit_to || '—'}`,
    `Reference: ${receipt.reference_no || '—'}`,
    '',
    'Thank you.',
    '',
    'Regards,',
    companyTradeName(company) || '',
  ].join('\n');
}

export function buildCreditNoteEmailBody(creditNote, company, customer, lineItems = []) {
  const cur = creditNote.currency || 'INR';
  const tax = bifurcateStoredTax(creditNote, creditNote.place_of_supply, resolveRegisteredState(company));
  const fmt = (v) => formatDocumentMoney(v, cur);
  const lines = [
    `Dear ${customer?.name || creditNote.customer_name || 'Customer'},`,
    '',
    'Please find credit note details below:',
    '',
    `Credit Note No: ${creditNote.credit_note_number}`,
    `Date: ${creditNote.issue_date || '—'}`,
    ...(creditNote.original_invoice_number
      ? [`Original Invoice: ${creditNote.original_invoice_number}`]
      : []),
    `Reason: ${creditNote.reason || '—'}`,
    '',
    '--- Amount Summary ---',
    `Taxable Value: ${fmt(creditNote.subtotal)}`,
    `CGST: ${fmt(tax.cgst)}`,
    `SGST: ${fmt(tax.sgst)}`,
    `IGST: ${fmt(tax.igst)}`,
    `Total Credit: ${fmt(creditNote.total_amount)}`,
    '',
  ];
  if (lineItems.length > 0) {
    lines.push('--- Line Items ---');
    lineItems.forEach((it, idx) => {
      const qty = it.quantity ?? 1;
      const rate = it.unit_price ?? it.rate ?? 0;
      const total = it.line_total ?? qty * rate;
      lines.push(
        `${idx + 1}. ${it.description || 'Item'} | HSN ${it.hsn_sac || '—'} | Qty ${qty} × ${fmt(rate)} = ${fmt(total)}`
      );
    });
    lines.push('');
  }
  lines.push('Regards,', companyTradeName(company) || '');
  return lines.join('\n');
}

export function buildDebitNoteEmailBody(debitNote, company, vendor, lineItems = []) {
  const cur = debitNote.currency || 'INR';
  const tax = bifurcateStoredTax(debitNote, debitNote.place_of_supply, resolveRegisteredState(company));
  const fmt = (v) => formatDocumentMoney(v, cur);
  const lines = [
    `Dear ${vendor?.name || debitNote.vendor_name || 'Supplier'},`,
    '',
    'Please find debit note details below:',
    '',
    `Debit Note No: ${debitNote.debit_note_number}`,
    `Date: ${debitNote.issue_date || '—'}`,
    ...(debitNote.original_expense_number
      ? [`Original Bill: ${debitNote.original_expense_number}`]
      : []),
    `Reason: ${debitNote.reason || '—'}`,
    '',
    '--- Amount Summary ---',
    `Taxable Value: ${fmt(debitNote.subtotal)}`,
    `CGST: ${fmt(tax.cgst)}`,
    `SGST: ${fmt(tax.sgst)}`,
    `IGST: ${fmt(tax.igst)}`,
    `Total Debit: ${fmt(debitNote.total_amount)}`,
    '',
  ];
  if (lineItems.length > 0) {
    lines.push('--- Line Items ---');
    lineItems.forEach((it, idx) => {
      const qty = it.quantity ?? 1;
      const rate = it.unit_price ?? it.rate ?? 0;
      const total = it.line_total ?? qty * rate;
      lines.push(
        `${idx + 1}. ${it.description || 'Item'} | HSN ${it.hsn_sac || '—'} | Qty ${qty} × ${fmt(rate)} = ${fmt(total)}`
      );
    });
    lines.push('');
  }
  lines.push('Regards,', companyTradeName(company) || '');
  return lines.join('\n');
}
