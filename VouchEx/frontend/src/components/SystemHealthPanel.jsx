import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Cpu, Database, RefreshCw, Shield, Zap } from 'lucide-react';
import { portalApi } from '../services/portalApi';
import { showApiError } from '../utils/apiErrors';

export default function SystemHealthPanel({
  inactivityTimeout,
  setInactivityTimeout,
  isDemoLogoutMode,
  setIsDemoLogoutMode,
}) {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [timeoutDraft, setTimeoutDraft] = useState(inactivityTimeout ?? 900);

  const loadHealth = useCallback(async () => {
    setLoading(true);
    try {
      const res = await portalApi.getSystemHealth();
      setHealth(res.health || null);
      if (typeof res.health?.inactivity_timeout === 'number') {
        setTimeoutDraft(res.health.inactivity_timeout);
        setInactivityTimeout(res.health.inactivity_timeout);
      }
    } catch (err) {
      showApiError('Loading system health', err);
    } finally {
      setLoading(false);
    }
  }, [setInactivityTimeout]);

  useEffect(() => {
    loadHealth();
  }, [loadHealth]);

  useEffect(() => {
    setTimeoutDraft(inactivityTimeout ?? 900);
  }, [inactivityTimeout]);

  const runAction = async (key, fn, confirmText) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setActionBusy(key);
    setActionMessage('');
    try {
      const res = await fn();
      setActionMessage(res.message || 'Done.');
      await loadHealth();
    } catch (err) {
      showApiError(key, err);
    } finally {
      setActionBusy('');
    }
  };

  const saveTimeout = async () => {
    setActionBusy('timeout');
    setActionMessage('');
    try {
      const res = await portalApi.updatePortalInactivityTimeout(timeoutDraft);
      const val = res.inactivity_timeout ?? timeoutDraft;
      setInactivityTimeout(val);
      setTimeoutDraft(val);
      setActionMessage('Inactivity timeout updated for the whole portal.');
    } catch (err) {
      showApiError('Updating inactivity timeout', err);
    } finally {
      setActionBusy('');
    }
  };

  if (loading && !health) {
    return <p style={{ color: 'var(--text-secondary)' }}>Loading system health…</p>;
  }

  const cards = health
    ? [
        { label: 'PHP', value: health.php_version, icon: Cpu },
        { label: 'Laravel', value: health.laravel_version, icon: Shield },
        { label: 'Environment', value: health.environment, icon: Zap },
        {
          label: 'Debug mode',
          value: health.debug ? 'ON' : 'OFF',
          warn: health.debug,
          icon: AlertTriangle,
        },
        {
          label: 'Database',
          value: health.database?.connected
            ? `Connected (${health.database?.name || '—'})`
            : `Error: ${health.database?.error || 'Unknown'}`,
          warn: !health.database?.connected,
          icon: Database,
        },
        { label: 'Server time', value: health.server_time, icon: RefreshCw },
        { label: 'Timezone', value: health.timezone, icon: RefreshCw },
      ]
    : [];

  return (
    <div className="system-health">
      <div className="error-banner" style={{ background: 'var(--accent-blue-bg, #eff6ff)', borderColor: 'var(--accent-blue)', color: 'var(--text-primary)' }}>
        <Shield size={18} />
        <span><strong>Super admin only.</strong> Portal-wide server tools — not company accounting data.</span>
      </div>

      <h3 className="form-section-title" style={{ marginTop: '20px' }}>Server status</h3>
      <div className="system-health-grid">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={`system-health-card${card.warn ? ' system-health-card--warn' : ''}`}>
              <Icon size={16} />
              <div>
                <div className="system-health-card__label">{card.label}</div>
                <div className="system-health-card__value">{card.value}</div>
              </div>
            </div>
          );
        })}
      </div>

      <h3 className="form-section-title" style={{ marginTop: '28px' }}>Inactivity session timeout</h3>
      <div className="master-form" style={{ maxWidth: '420px' }}>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
          Portal-wide auto-logout timer (seconds). Applies to all users after login.
        </p>
        <div className="form-group">
          <label>Auto-logout timer (seconds)</label>
          <input
            type="number"
            className="form-input"
            min={60}
            max={7200}
            value={timeoutDraft}
            onChange={(e) => setTimeoutDraft(parseInt(e.target.value || '900', 10))}
          />
        </div>
        <button type="button" className="btn-primary" disabled={actionBusy === 'timeout'} onClick={saveTimeout}>
          {actionBusy === 'timeout' ? 'Saving…' : 'Save timeout'}
        </button>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '10px' }}>
          Default: 900 (15 min). For demo testing use 15–30s and enable Demo Inactivity Simulator in the console drawer.
        </p>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', fontSize: '13px' }}>
          <input type="checkbox" checked={isDemoLogoutMode} onChange={(e) => setIsDemoLogoutMode(e.target.checked)} />
          Demo inactivity simulator mode
        </label>
      </div>

      <h3 className="form-section-title" style={{ marginTop: '28px' }}>Technical error log (last ~50 lines)</h3>
      <div className="system-health-log">
        {(health?.log_lines || []).map((line, idx) => (
          <div key={`${idx}-${line.text.slice(0, 24)}`} className={`system-health-log__line system-health-log__line--${line.level}`}>
            {line.text}
          </div>
        ))}
      </div>

      <h3 className="form-section-title" style={{ marginTop: '28px' }}>Admin actions</h3>
      <div className="btn-row" style={{ flexWrap: 'wrap', gap: '10px' }}>
        <button
          type="button"
          className="btn-secondary"
          disabled={!!actionBusy}
          onClick={() => runAction('clear-cache', () => portalApi.clearSystemCache(), 'Clear all Laravel caches (config, routes, views)?')}
        >
          {actionBusy === 'clear-cache' ? 'Clearing…' : 'Clear cache'}
        </button>
        <button
          type="button"
          className="btn-secondary"
          disabled={!!actionBusy}
          onClick={() => runAction('optimize', () => portalApi.optimizeSystem())}
        >
          {actionBusy === 'optimize' ? 'Optimizing…' : 'Optimize'}
        </button>
        {health?.migrations_allowed ? (
          <button
            type="button"
            className="btn-primary"
            disabled={!!actionBusy}
            onClick={() =>
              runAction(
                'migrate',
                () => portalApi.runSystemMigrations(),
                'Run pending database migrations? This will update database structure.'
              )
            }
          >
            {actionBusy === 'migrate' ? 'Running…' : 'Run migrations'}
          </button>
        ) : (
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', alignSelf: 'center' }}>
            Migrations disabled in production. Set <code>APP_ALLOW_DANGEROUS_SYSTEM=true</code> in .env when needed.
          </p>
        )}
        <button type="button" className="btn-secondary" disabled={loading} onClick={loadHealth}>
          Refresh status
        </button>
      </div>

      {actionMessage && (
        <div className="error-banner" style={{ marginTop: '16px', background: 'var(--accent-green-bg)', borderColor: 'var(--accent-green)', color: 'var(--accent-green)' }}>
          {actionMessage}
        </div>
      )}
    </div>
  );
}
