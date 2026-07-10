import { useEffect, useState } from 'react';
import { AlertTriangle, Copy, X } from 'lucide-react';
import { formatApiError, parseApiError, registerErrorDialog } from '../utils/apiErrors';

export default function ApiErrorDialog() {
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState(null);
  const [copyLabel, setCopyLabel] = useState('Copy details');

  useEffect(() => {
    registerErrorDialog((context, err, fallback) => {
      const parsed = parseApiError(err, context);
      if (!parsed.sections.length && fallback) {
        parsed.sections.push({ title: 'Problem', body: fallback, tone: 'error' });
      }
      setPayload(parsed);
      setCopyLabel('Copy details');
      setOpen(true);
    });
    return () => registerErrorDialog(null);
  }, []);

  if (!open || !payload) return null;

  const fullText = payload.sections.map((s) => `${s.title}:\n${s.body}`).join('\n\n');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullText);
      setCopyLabel('Copied!');
      setTimeout(() => setCopyLabel('Copy details'), 2000);
    } catch {
      setCopyLabel('Copy failed');
    }
  };

  return (
    <div
      className="portal-modal-overlay portal-modal-overlay-solid api-error-overlay"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="api-error-title"
    >
      <div className="portal-modal-card portal-modal-card-solid api-error-card">
        <div className="portal-modal-header api-error-header">
          <div className="api-error-title-row">
            <AlertTriangle size={20} className="api-error-icon" aria-hidden />
            <h4 id="api-error-title">{payload.title}</h4>
          </div>
          <button type="button" className="portal-modal-close" onClick={() => setOpen(false)} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className="portal-modal-body api-error-body">
          {payload.sections.map((section) => (
            <div key={section.title} className={`api-error-section api-error-tone-${section.tone}`}>
              <div className="api-error-section-title">{section.title}</div>
              <pre className="api-error-section-body">{section.body}</pre>
            </div>
          ))}
        </div>
        <div className="api-error-footer">
          <button type="button" className="btn-secondary api-error-copy-btn" onClick={handleCopy}>
            <Copy size={14} aria-hidden />
            {copyLabel}
          </button>
          <button type="button" className="btn-primary" onClick={() => setOpen(false)}>
            OK, I understand
          </button>
        </div>
      </div>
    </div>
  );
}
