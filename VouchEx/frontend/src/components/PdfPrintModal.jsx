import React, { useRef, useState } from 'react';
import { Download } from 'lucide-react';
import { downloadBlobFile, generateDocumentPdfFile, sanitizePdfFileName } from '../utils/generateDocumentPdf';

/** Screen preview + print/download wrapper for A4 PDF documents. Toolbar hidden when printing. */
export function PdfPrintModal({
  onClose,
  screenTitle,
  children,
  maxWidth = 800,
  toolbarExtra = null,
  closeLabel = 'Close Viewer',
  downloadFileName = null,
}) {
  const documentRef = useRef(null);
  const [downloading, setDownloading] = useState(false);

  const enhancedToolbar =
    toolbarExtra && React.isValidElement(toolbarExtra)
      ? React.cloneElement(toolbarExtra, { documentRef })
      : toolbarExtra;

  const handleDownload = async () => {
    const el = documentRef.current;
    const named = downloadFileName ? sanitizePdfFileName(downloadFileName) : null;

    if (el && named) {
      setDownloading(true);
      try {
        const file = await generateDocumentPdfFile(el, named);
        downloadBlobFile(file);
        return;
      } catch {
        // Fall through to browser print / Save as PDF
      } finally {
        setDownloading(false);
      }
    }

    const prevTitle = document.title;
    if (named) {
      document.title = named.replace(/\.pdf$/i, '');
    }
    window.print();
    if (named) {
      setTimeout(() => {
        document.title = prevTitle;
      }, 500);
    }
  };

  return (
    <div className="modal-overlay pdf-print-overlay" onClick={onClose}>
      <div
        className="pdf-preview-card"
        style={{ maxWidth: typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pdf-print-toolbar">
          <h2 className="pdf-print-screen-title">{screenTitle}</h2>
          <div className="pdf-print-toolbar-actions">
            {enhancedToolbar}
            <button
              type="button"
              className="btn-primary"
              style={{ background: '#111', color: 'white' }}
              disabled={downloading}
              onClick={handleDownload}
            >
              <Download size={14} /> {downloading ? 'Preparing…' : 'Download PDF'}
            </button>
            <button type="button" className="btn-secondary" onClick={onClose}>
              {closeLabel}
            </button>
          </div>
        </div>
        <div className="pdf-print-document" ref={documentRef}>
          {children}
        </div>
      </div>
    </div>
  );
}
