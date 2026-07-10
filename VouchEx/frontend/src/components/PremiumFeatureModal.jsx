import React from 'react';
import { Crown, X } from 'lucide-react';

export default function PremiumFeatureModal({ open, title, message, onClose, onUpgrade }) {
  if (!open) return null;

  return (
    <div className="premium-modal-overlay" onClick={onClose}>
      <div className="premium-modal-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="premium-modal-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
        <div className="premium-modal-icon">
          <Crown size={28} />
        </div>
        <h3>{title || 'Premium feature'}</h3>
        <p>{message || 'This feature is available on paid plans.'}</p>
        <div className="premium-modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Maybe later
          </button>
          {onUpgrade && (
            <button type="button" className="btn-primary" onClick={onUpgrade}>
              View plans
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
