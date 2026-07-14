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
import { downloadBlobFile, generateDocumentPdfFile, sanitizePdfFileName } from './generateDocumentPdf';

export function buildInvoiceSharePayload(invoice, { company, customer, lineItems, fromEmail }) {
  return {
    emailTo: customer?.email || '',
    phone: customer?.phone || '',
    subject: `Tax Invoice ${invoice.invoice_number} — ${companyTradeName(company)}`,
    body: buildInvoiceEmailBody(invoice, company, customer, lineItems),
    fromEmail,
    fileName: sanitizePdfFileName(`Invoice-${invoice.invoice_number}`),
  };
}

export function buildReceiptSharePayload(receipt, { company, customer, invoices, fromEmail }) {
  return {
    emailTo: customer?.email || '',
    phone: customer?.phone || '',
    subject: `Receipt ${receipt.receipt_number} — ${companyTradeName(company)}`,
    body: buildReceiptVoucherEmailBody(receipt, company, invoices),
    fromEmail,
    fileName: sanitizePdfFileName(`Receipt-${receipt.receipt_number}`),
  };
}

export function buildCreditNoteSharePayload(creditNote, { company, customer, lineItems, fromEmail }) {
  return {
    emailTo: customer?.email || '',
    phone: customer?.phone || '',
    subject: `Credit Note ${creditNote.credit_note_number} — ${companyTradeName(company)}`,
    body: buildCreditNoteEmailBody(creditNote, company, customer, lineItems),
    fromEmail,
    fileName: sanitizePdfFileName(`CreditNote-${creditNote.credit_note_number}`),
  };
}

export function buildDebitNoteSharePayload(debitNote, { company, vendor, lineItems, fromEmail }) {
  return {
    emailTo: vendor?.email || '',
    phone: vendor?.phone || '',
    subject: `Debit Note ${debitNote.debit_note_number} — ${companyTradeName(company)}`,
    body: buildDebitNoteEmailBody(debitNote, company, vendor, lineItems),
    fromEmail,
    fileName: sanitizePdfFileName(`DebitNote-${debitNote.debit_note_number}`),
  };
}

export function buildPaymentSharePayload(payment, { company, vendor, expenses, fromEmail }) {
  return {
    emailTo: vendor?.email || '',
    phone: vendor?.phone || '',
    subject: `Payment Voucher ${payment.payment_number} — ${companyTradeName(company)}`,
    body: buildPaymentVoucherEmailBody(payment, company, expenses),
    fromEmail,
    fileName: sanitizePdfFileName(`Payment-${payment.payment_number}`),
  };
}

export function canSharePdfFiles(file) {
  try {
    if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return false;
    if (!file) return false;
    if (typeof navigator.canShare === 'function') {
      return navigator.canShare({ files: [file] });
    }
    return false;
  } catch {
    return false;
  }
}

function attachHint(fileName) {
  return `PDF downloaded as "${fileName}". Please attach that file to this message.`;
}

/**
 * Text compose only (no PDF) — used by list-row actions without a PDF preview DOM.
 */
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

/**
 * Generate PDF from preview element and share via OS sheet (with file) or download + compose.
 * @param {'email'|'whatsapp'} channel
 * @param {object} payload — share fields including optional fileName
 * @param {HTMLElement} pdfElement — `.pdf-print-document` node
 * @returns {Promise<{ method: 'share'|'download-compose' }>}
 */
export async function shareDocumentWithPdf(channel, payload, pdfElement) {
  const fileName = sanitizePdfFileName(payload?.fileName || 'document.pdf');
  const pdfFile = await generateDocumentPdfFile(pdfElement, fileName);
  const title = payload?.subject || fileName;
  const text = payload?.body || '';

  if (canSharePdfFiles(pdfFile)) {
    try {
      await navigator.share({
        files: [pdfFile],
        title,
        text: channel === 'whatsapp' ? text : `${title}\n\n${text}`.trim(),
      });
      return { method: 'share' };
    } catch (err) {
      // User cancelled share sheet — don't force download/compose.
      if (err?.name === 'AbortError') {
        return { method: 'cancelled' };
      }
      // Fall through to download + compose if share fails for other reasons.
    }
  }

  downloadBlobFile(pdfFile);
  const bodyWithHint = `${attachHint(pdfFile.name)}\n\n${text}`.trim();

  if (channel === 'whatsapp') {
    openWhatsAppCompose({
      phone: payload?.phone,
      text: bodyWithHint,
    });
  } else {
    openGmailCompose({
      to: payload?.emailTo,
      subject: payload?.subject,
      body: bodyWithHint,
      fromEmail: payload?.fromEmail,
    });
  }

  return { method: 'download-compose' };
}
