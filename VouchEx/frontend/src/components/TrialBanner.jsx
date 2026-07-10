import React from 'react';
import { Clock, Sparkles } from 'lucide-react';

export default function TrialBanner({ account, onUpgrade }) {
  const sub = account?.subscription;
  if (!sub || sub.status !== 'trial') return null;

  const days = sub.trial_days_remaining ?? 0;
  const urgent = days <= 7;

  return (
    <div
      className={`trial-banner ${urgent ? 'trial-banner--urgent' : ''}`}
      role="status"
    >
      <Sparkles size={16} aria-hidden />
      <span>
        Free trial — <strong>{days}</strong> day{days === 1 ? '' : 's'} left
      </span>
      {onUpgrade && (
        <button type="button" className="trial-banner__upgrade" onClick={onUpgrade}>
          <Clock size={14} aria-hidden />
          Upgrade
        </button>
      )}
    </div>
  );
}
