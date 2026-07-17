import html2pdf from 'html2pdf.js';

/** Safe filename for downloads / share sheets. Keeps spaces for readability. */
export function sanitizePdfFileName(name, fallback = 'document') {
  const base = String(name || fallback)
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[.\s]+|[.\s]+$/g, '')
    .slice(0, 150);
  const withExt = /\.pdf$/i.test(base) ? base : `${base || fallback}.pdf`;
  return withExt;
}

/** Short invoice no for filenames — INV-2026-002 → 2 */
export function invoiceFileNumber(invoiceNumber) {
  const s = String(invoiceNumber || '').trim();
  if (!s) return '';
  const m = s.match(/(\d+)(?!.*\d)/);
  if (m) return String(Number(m[1]));
  return s;
}

/**
 * e.g. "Invoice 2 - Girnar Software Private Limited - Value Rs 9,13,382.54.pdf"
 */
export function buildInvoicePdfFileName(invoice, { amount } = {}) {
  const no = invoiceFileNumber(invoice?.invoice_number) || invoice?.invoice_number || 'Invoice';
  const party = String(invoice?.customer_name || 'Customer').replace(/\s+/g, ' ').trim() || 'Customer';
  const total = amount != null ? amount : invoice?.total_amount;
  const valuePart = formatInrValueForFileName(total, invoice?.currency || 'INR');
  return sanitizePdfFileName(`Invoice ${no} - ${party} - Value ${valuePart}`);
}

function formatInrValueForFileName(value, currency = 'INR') {
  const code = String(currency || 'INR').toUpperCase();
  const n = Number(value);
  const num = Number.isFinite(n)
    ? n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '0.00';
  if (code === 'INR') return `Rs ${num}`;
  return `${code} ${num}`;
}

/**
 * Render an on-screen PDF preview DOM node to a PDF File (A4).
 * @param {HTMLElement} element — typically `.pdf-print-document` root
 * @param {string} fileName
 * @returns {Promise<File>}
 */
export async function generateDocumentPdfFile(element, fileName = 'document.pdf') {
  if (!element) {
    throw new Error('PDF preview is not ready. Open the document viewer and try again.');
  }

  const safeName = sanitizePdfFileName(fileName);
  const opt = {
    margin: [8, 8, 8, 8],
    filename: safeName,
    image: { type: 'jpeg', quality: 0.96 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      logging: false,
      scrollX: 0,
      scrollY: 0,
      backgroundColor: '#ffffff',
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
  };

  const worker = html2pdf().set(opt).from(element);
  const blob = await worker.outputPdf('blob');
  return new File([blob], safeName, { type: 'application/pdf' });
}

/** Trigger a browser download for a Blob/File. */
export function downloadBlobFile(file) {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name || 'document.pdf';
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
