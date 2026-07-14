import html2pdf from 'html2pdf.js';

/** Safe filename fragment for downloads / share sheets. */
export function sanitizePdfFileName(name, fallback = 'document') {
  const base = String(name || fallback)
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120);
  const withExt = /\.pdf$/i.test(base) ? base : `${base || fallback}.pdf`;
  return withExt;
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
