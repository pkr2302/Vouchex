import React, { useState } from 'react';
import { Mail, MessageCircle } from 'lucide-react';
import { shareByEmail, shareByWhatsApp, shareDocumentWithPdf } from '../utils/documentShare';

/**
 * Email + WhatsApp share actions for vouchers/invoices.
 * When documentRef is provided (PDF modal), generates a PDF and shares/attaches it.
 * @param {object} share — { emailTo, phone, subject, body, fromEmail, fileName }
 * @param {React.RefObject} [documentRef] — ref to `.pdf-print-document`
 */
export function DocumentShareButtons({ share, compact = false, className = '', documentRef = null }) {
  const [busyChannel, setBusyChannel] = useState(null);

  if (!share) return null;

  const btnStyle = compact
    ? { padding: '6px 10px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }
    : { padding: '8px 14px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' };

  const withPdf = !!documentRef;

  const handleShare = async (channel) => {
    if (busyChannel) return;

    const el = documentRef?.current;
    if (!withPdf || !el) {
      if (channel === 'whatsapp') shareByWhatsApp(share);
      else shareByEmail(share);
      return;
    }

    setBusyChannel(channel);
    try {
      await shareDocumentWithPdf(channel, share, el);
    } catch (err) {
      window.alert(err?.message || 'Could not prepare the PDF. Please try Download PDF, then attach manually.');
    } finally {
      setBusyChannel(null);
    }
  };

  const busy = !!busyChannel;

  return (
    <div className={`document-share-buttons ${className}`.trim()}>
      <button
        type="button"
        className="btn-secondary document-share-btn document-share-btn--email"
        style={btnStyle}
        disabled={busy}
        title={
          withPdf
            ? (share.emailTo ? `Email PDF to ${share.emailTo}` : 'Share or email PDF')
            : (share.emailTo ? `Email ${share.emailTo}` : 'Open email compose')
        }
        onClick={() => handleShare('email')}
      >
        <Mail size={compact ? 12 : 14} />
        {busyChannel === 'email' ? 'Preparing…' : 'Email'}
      </button>
      <button
        type="button"
        className="btn-secondary document-share-btn document-share-btn--whatsapp"
        style={{
          ...btnStyle,
          borderColor: 'rgba(37, 211, 102, 0.45)',
          color: '#128c7e',
        }}
        disabled={busy}
        title={
          withPdf
            ? (share.phone ? `WhatsApp PDF to ${share.phone}` : 'Share PDF via WhatsApp')
            : (share.phone ? `WhatsApp ${share.phone}` : 'Open WhatsApp — select contact')
        }
        onClick={() => handleShare('whatsapp')}
      >
        <MessageCircle size={compact ? 12 : 14} />
        {busyChannel === 'whatsapp' ? 'Preparing…' : 'WhatsApp'}
      </button>
    </div>
  );
}

/** Toolbar row for PdfPrintModal — PDF attach when documentRef is injected by modal. */
export function DocumentShareToolbar({ share, documentRef = null }) {
  if (!share) return null;
  return <DocumentShareButtons share={share} compact={false} documentRef={documentRef} />;
}
