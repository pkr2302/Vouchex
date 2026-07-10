import { Monitor, ArrowLeft } from 'lucide-react';
import { TAB_TITLES } from '../SidebarNav';
import { MOBILE_HOME_TAB } from '../../utils/mobileAppConfig';

export default function MobileDesktopOnlyGate({ tabId, onGoHome }) {
  const title = TAB_TITLES()[tabId] || tabId;

  return (
    <div className="mobile-desktop-gate mobile-only">
      <div className="mobile-desktop-gate__card">
        <span className="mobile-desktop-gate__icon" aria-hidden="true">
          <Monitor size={32} />
        </span>
        <h2>{title}</h2>
        <p>
          This section is built for desktop — wide tables, registers, and compliance views.
          Use your computer browser for reports and analysis.
        </p>
        <p className="mobile-desktop-gate__sub">
          On mobile, use VouchEx to <strong>record transactions</strong> only.
        </p>
        <button type="button" className="mobile-desktop-gate__btn" onClick={() => onGoHome?.(MOBILE_HOME_TAB)}>
          <ArrowLeft size={18} />
          Back to quick record
        </button>
      </div>
    </div>
  );
}
