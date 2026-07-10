import React from 'react';
import { Download } from 'lucide-react';

/** Screen preview + print/download wrapper for A4 PDF documents. Toolbar hidden when printing. */
export function PdfPrintModal({ onClose, screenTitle, children, maxWidth = 800, toolbarExtra = null, closeLabel = 'Close Viewer' }) {
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
            {toolbarExtra}
            <button
              type="button"
              className="btn-primary"
              style={{ background: '#111', color: 'white' }}
              onClick={() => window.print()}
            >
              <Download size={14} /> Download PDF
            </button>
            <button type="button" className="btn-secondary" onClick={onClose}>
              {closeLabel}
            </button>
          </div>
        </div>
        <div className="pdf-print-document">{children}</div>
      </div>
    </div>
  );
}
