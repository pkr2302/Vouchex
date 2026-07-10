import { companyTradeName } from './companyDisplay';
import {
  openGmailCompose,
  buildInvoiceEmailBody,
  buildPaymentVoucherEmailBody,
  buildReceiptVoucherEmailBody,
  buildCreditNoteEmailBody,
  buildDebitNoteEmailBody,
} from './emailCompose';
import { openWhatsAppCompose } from './whatsappCompose';

export function buildInvoiceSharePayload(invoice, { company, customer, lineItems, fromEmail }) {
  return {
    emailTo: customer?.email || '',
    phone: customer?.phone || '',
    subject: `Tax Invoice ${invoice.invoice_number} — ${companyTradeName(company)}`,
    body: buildInvoiceEmailBody(invoice, company, customer, lineItems),
    fromEmail,
  };
}

export function buildReceiptSharePayload(receipt, { company, customer, invoices, fromEmail }) {
  return {
    emailTo: customer?.email || '',
    phone: customer?.phone || '',
    subject: `Receipt ${receipt.receipt_number} — ${companyTradeName(company)}`,
    body: buildReceiptVoucherEmailBody(receipt, company, invoices),
    fromEmail,
  };
}

export function buildCreditNoteSharePayload(creditNote, { company, customer, lineItems, fromEmail }) {
  return {
    emailTo: customer?.email || '',
    phone: customer?.phone || '',
    subject: `Credit Note ${creditNote.credit_note_number} — ${companyTradeName(company)}`,
    body: buildCreditNoteEmailBody(creditNote, company, customer, lineItems),
    fromEmail,
  };
}

export function buildDebitNoteSharePayload(debitNote, { company, vendor, lineItems, fromEmail }) {
  return {
    emailTo: vendor?.email || '',
    phone: vendor?.phone || '',
    subject: `Debit Note ${debitNote.debit_note_number} — ${companyTradeName(company)}`,
    body: buildDebitNoteEmailBody(debitNote, company, vendor, lineItems),
    fromEmail,
  };
}

export function buildPaymentSharePayload(payment, { company, vendor, expenses, fromEmail }) {
  return {
    emailTo: vendor?.email || '',
    phone: vendor?.phone || '',
    subject: `Payment Voucher ${payment.payment_number} — ${companyTradeName(company)}`,
    body: buildPaymentVoucherEmailBody(payment, company, expenses),
    fromEmail,
  };
}

export function shareByEmail(payload) {
  openGmailCompose({
    to: payload.emailTo,
    subject: payload.subject,
    body: payload.body,
    fromEmail: payload.fromEmail,
  });
}

export function shareByWhatsApp(payload) {
  openWhatsAppCompose({
    phone: payload.phone,
    text: payload.body,
  });
}
