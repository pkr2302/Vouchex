import { X, Settings, User, Building2, Shield, Lock, Database, CreditCard, ChevronRight } from 'lucide-react';

const SETTINGS_LINKS = [
  { id: 'settings', label: 'Company & profile', desc: 'Business details, logo, GST', icon: Building2, section: 'company' },
  { id: 'settings', label: 'Users & roles', desc: 'Team access', icon: User, section: 'users' },
  { id: 'settings', label: 'GST compliance', desc: 'E-invoice, e-way bill', icon: Shield, section: 'gst' },
  { id: 'settings', label: 'Financial year lock', desc: 'Period controls', icon: Lock, section: 'fy' },
  { id: 'settings', label: 'Backups', desc: 'Export company data', icon: Database, section: 'backup' },
  { id: 'settings', label: 'Subscription', desc: 'Plan & billing', icon: CreditCard, section: 'subscription' },
];

export default function MobileSettingsSheet({ open, onClose, onOpenSettings }) {
  if (!open) return null;

  return (
    <div className="mobile-settings-sheet mobile-only" role="dialog" aria-modal="true" aria-label="Settings">
      <button type="button" className="mobile-settings-sheet__backdrop" onClick={onClose} aria-label="Close" />
      <div className="mobile-settings-sheet__panel">
        <div className="mobile-settings-sheet__header">
          <h3><Settings size={20} /> Settings</h3>
          <button type="button" onClick={onClose} aria-label="Close"><X size={22} /></button>
        </div>
        <ul className="mobile-settings-sheet__list">
          {SETTINGS_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <li key={link.section}>
                <button
                  type="button"
                  onClick={() => {
                    onOpenSettings?.(link.section);
                    onClose();
                  }}
                >
                  <span className="mobile-settings-sheet__icon"><Icon size={20} /></span>
                  <div>
                    <strong>{link.label}</strong>
                    <span>{link.desc}</span>
                  </div>
                  <ChevronRight size={18} />
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
