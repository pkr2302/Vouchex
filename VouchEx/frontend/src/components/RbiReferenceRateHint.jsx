import React, { useCallback, useEffect, useState } from 'react';
import { portalApi } from '../services/portalApi';
import { formatCurrencyLabel } from '../utils/currencyData';

export function RbiReferenceRateHint({ currency, date, onUseRate }) {
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    if (!currency || currency === 'INR') return;

    setLoading(true);
    setError('');

    portalApi
      .fetchReferenceRate(currency, date)
      .then((res) => {
        setInfo(res.reference || null);
      })
      .catch((err) => {
        setInfo(null);
        setError(err?.data?.message || err?.message || 'Rate lookup unavailable. Enter manually.');
      })
      .finally(() => setLoading(false));
  }, [currency, date]);

  useEffect(() => {
    if (!currency || currency === 'INR') {
      setInfo(null);
      setError('');
      return;
    }
    load();
  }, [currency, date, load]);

  if (!currency || currency === 'INR') return null;

  const sourceLabel = info?.source === 'rbi' || info?.source === 'rbi_cached'
    ? 'RBI reference'
    : info?.source === 'ecb_market'
      ? 'Market reference (ECB)'
      : 'Reference rate';

  return (
    <div className="rbi-rate-hint" style={{ marginTop: 6 }}>
      {loading && (
        <p className="form-hint" style={{ margin: 0 }}>Loading reference rate…</p>
      )}
      {!loading && error && (
        <p className="form-hint" style={{ margin: 0, color: 'var(--accent-amber)' }}>
          {error}{' '}
          <button type="button" className="btn-secondary-sm" style={{ padding: '2px 8px', fontSize: 10 }} onClick={load}>
            Retry
          </button>
        </p>
      )}
      {!loading && !error && info?.available && info.rate != null && (
        <p className="form-hint" style={{ margin: 0 }}>
          {sourceLabel}{info.rate_date ? ` (${info.rate_date})` : ''}:{' '}
          <strong>1 {currency} = {info.rate} INR</strong>
          {' '}
          <button
            type="button"
            className="btn-secondary-sm"
            style={{ marginLeft: 6, padding: '2px 8px', fontSize: 10 }}
            onClick={() => onUseRate?.(String(info.rate))}
          >
            Use this rate
          </button>
        </p>
      )}
      {!loading && !error && info && !info.available && (
        <p className="form-hint" style={{ margin: 0, color: 'var(--text-muted)' }}>
          {info.message || `No RBI reference rate for ${formatCurrencyLabel(currency)}. Enter manually.`}
        </p>
      )}
      {info?.note && (
        <p className="form-hint" style={{ margin: '4px 0 0', fontSize: 10, color: 'var(--text-muted)' }}>{info.note}</p>
      )}
    </div>
  );
}
