import React from 'react';
import { Mail, MessageCircle } from 'lucide-react';
import { shareByEmail, shareByWhatsApp } from '../utils/documentShare';

/**
 * Email + WhatsApp share actions for vouchers/invoices.
 * @param {object} share — { emailTo, phone, subject, body, fromEmail }
 */
export function DocumentShareButtons({ share, compact = false, className = '' }) {
  if (!share) return null;

  const btnStyle = compact
    ? { padding: '6px 10px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }
    : { padding: '8px 14px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' };

  return (
    <div className={`document-share-buttons ${className}`.trim()}>
      <button
        type="button"
        className="btn-secondary document-share-btn document-share-btn--email"
        style={btnStyle}
        title={share.emailTo ? `Email ${share.emailTo}` : 'Open email compose'}
        onClick={() => shareByEmail(share)}
      >
        <Mail size={compact ? 12 : 14} /> Email
      </button>
      <button
        type="button"
        className="btn-secondary document-share-btn document-share-btn--whatsapp"
        style={{
          ...btnStyle,
          borderColor: 'rgba(37, 211, 102, 0.45)',
          color: '#128c7e',
        }}
        title={share.phone ? `WhatsApp ${share.phone}` : 'Open WhatsApp — select contact'}
        onClick={() => shareByWhatsApp(share)}
      >
        <MessageCircle size={compact ? 12 : 14} /> WhatsApp
      </button>
    </div>
  );
}

/** Toolbar row for PdfPrintModal — same actions, non-compact. */
export function DocumentShareToolbar({ share }) {
  if (!share) return null;
  return <DocumentShareButtons share={share} compact={false} />;
}
