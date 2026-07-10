import { Bell, X, ChevronRight } from 'lucide-react';
import { formatINR } from '../../utils/formatMoney';

export default function MobileNotificationsPanel({ open, onClose, notifications = [], onNavigate }) {
  if (!open) return null;

  return (
    <div className="mobile-notifications-panel" role="dialog" aria-modal="true" aria-label="Notifications">
      <button type="button" className="mobile-notifications-panel__backdrop" onClick={onClose} aria-label="Close" />
      <div className="mobile-notifications-panel__sheet">
        <div className="mobile-notifications-panel__header">
          <h3><Bell size={20} /> Notifications</h3>
          <button type="button" onClick={onClose} aria-label="Close"><X size={22} /></button>
        </div>
        <div className="mobile-notifications-panel__body">
          {!notifications.length && (
            <p className="mobile-notifications-empty">You&apos;re all caught up — no alerts right now.</p>
          )}
          {notifications.map((n) => (
            <button
              key={n.id}
              type="button"
              className={`mobile-notification-item mobile-notification-item--${n.severity || 'info'}`}
              onClick={() => {
                if (n.tab) onNavigate(n.tab);
                onClose();
              }}
            >
              <div>
                <strong>{n.title}</strong>
                <p>{n.body}</p>
                {n.amount != null && n.amount > 0 && (
                  <span className="mobile-notification-item__amount">₹{formatINR(n.amount)}</span>
                )}
              </div>
              {n.tab && <ChevronRight size={18} />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
