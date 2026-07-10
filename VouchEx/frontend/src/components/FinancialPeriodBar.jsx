import { useEffect, useRef, useState } from 'react';
import {
  formatFinancialYearLabel,
  formatReportDateShort,
  getFinancialYearOptions,
  getDefaultAppliedPeriod,
  resolvePresetPeriod,
  validatePeriodDraft,
} from '../utils/financialPeriod';

export default function FinancialPeriodBar({
  draft,
  onDraftChange,
  onApply,
  periodError,
  loading = false,
}) {
  const [halfOpen, setHalfOpen] = useState(false);
  const [quarterOpen, setQuarterOpen] = useState(false);
  const barRef = useRef(null);

  const fyOptions = getFinancialYearOptions();

  useEffect(() => {
    const closeMenus = (e) => {
      if (barRef.current && !barRef.current.contains(e.target)) {
        setHalfOpen(false);
        setQuarterOpen(false);
      }
    };
    document.addEventListener('mousedown', closeMenus);
    return () => document.removeEventListener('mousedown', closeMenus);
  }, []);

  const setDraft = (patch) => onDraftChange({ ...draft, ...patch });

  const selectPreset = (presetKey, subKey = null) => {
    const resolved = resolvePresetPeriod(draft.fyStartYear, presetKey, subKey);
    if (!resolved) return;
    setDraft({
      presetKey,
      subKey,
      from: resolved.from,
      to: resolved.to,
      asOf: resolved.asOf,
      periodLabel: resolved.periodLabel,
    });
    setHalfOpen(false);
    setQuarterOpen(false);
  };

  const onFyChange = (startYear) => {
    const fy = parseInt(startYear, 10);
    const presetKey = draft.presetKey === 'custom' ? 'ytd' : draft.presetKey;
    const resolved = resolvePresetPeriod(fy, presetKey, draft.subKey) || resolvePresetPeriod(fy, 'ytd');
    setDraft({
      fyStartYear: fy,
      presetKey,
      from: resolved.from,
      to: resolved.to,
      asOf: resolved.asOf,
      periodLabel: resolved.periodLabel,
    });
  };

  const onManualDateChange = (field, value) => {
    setDraft({
      [field]: value,
      asOf: field === 'to' ? value : draft.asOf,
      presetKey: 'custom',
      subKey: null,
      periodLabel: 'Custom Period',
    });
  };

  const handleOk = () => {
    const err = validatePeriodDraft(draft);
    if (err) {
      onApply(null, err);
      return;
    }
    onApply({
      fyStartYear: draft.fyStartYear,
      presetKey: draft.presetKey,
      subKey: draft.subKey,
      from: draft.from,
      to: draft.to,
      asOf: draft.asOf || draft.to,
      periodLabel: draft.periodLabel,
    });
  };

  return (
    <div className="financial-period-bar" ref={barRef}>
      <div className="financial-period-bar__row">
        <label className="financial-period-bar__field">
          <span className="financial-period-bar__label">Financial Year</span>
          <select
            className="form-input financial-period-bar__select"
            value={draft.fyStartYear}
            onChange={(e) => onFyChange(e.target.value)}
          >
            {fyOptions.map((opt) => (
              <option key={opt.startYear} value={opt.startYear}>{opt.label}</option>
            ))}
          </select>
        </label>

        <div className="financial-period-bar__pills">
          <button
            type="button"
            className={`dashboard-time-filter__pill financial-period-bar__pill${draft.presetKey === 'ytd' ? ' dashboard-time-filter__pill--active' : ''}`}
            onClick={() => selectPreset('ytd')}
          >
            Year to Date
          </button>

          <div className="financial-period-bar__menu-wrap">
            <button
              type="button"
              className={`dashboard-time-filter__pill financial-period-bar__pill${draft.presetKey === 'half' ? ' dashboard-time-filter__pill--active' : ''}`}
              onClick={() => { setHalfOpen((v) => !v); setQuarterOpen(false); }}
            >
              Half Yearly ▾
            </button>
            {halfOpen && (
              <div className="financial-period-bar__menu">
                <button type="button" onClick={() => selectPreset('half', 'h1')}>Apr – Sep</button>
                <button type="button" onClick={() => selectPreset('half', 'h2')}>Oct – Mar</button>
              </div>
            )}
          </div>

          <div className="financial-period-bar__menu-wrap">
            <button
              type="button"
              className={`dashboard-time-filter__pill financial-period-bar__pill${draft.presetKey === 'quarter' ? ' dashboard-time-filter__pill--active' : ''}`}
              onClick={() => { setQuarterOpen((v) => !v); setHalfOpen(false); }}
            >
              Quarterly ▾
            </button>
            {quarterOpen && (
              <div className="financial-period-bar__menu">
                <button type="button" onClick={() => selectPreset('quarter', 'q1')}>Q1 (Apr–Jun)</button>
                <button type="button" onClick={() => selectPreset('quarter', 'q2')}>Q2 (Jul–Sep)</button>
                <button type="button" onClick={() => selectPreset('quarter', 'q3')}>Q3 (Oct–Dec)</button>
                <button type="button" onClick={() => selectPreset('quarter', 'q4')}>Q4 (Jan–Mar)</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="financial-period-bar__row financial-period-bar__row--dates">
        <label className="financial-period-bar__field">
          <span className="financial-period-bar__label">From</span>
          <input
            type="date"
            className="form-input financial-period-bar__date"
            value={draft.from}
            onChange={(e) => onManualDateChange('from', e.target.value)}
          />
        </label>
        <label className="financial-period-bar__field">
          <span className="financial-period-bar__label">To</span>
          <input
            type="date"
            className="form-input financial-period-bar__date"
            value={draft.to}
            onChange={(e) => onManualDateChange('to', e.target.value)}
          />
        </label>
        <span className="financial-period-bar__hint">
          {draft.from && draft.to ? `${formatReportDateShort(draft.from)} – ${formatReportDateShort(draft.to)}` : ''}
          {draft.periodLabel ? ` · ${draft.periodLabel}` : ''}
        </span>
        <button type="button" className="btn-primary financial-period-bar__ok" onClick={handleOk} disabled={loading}>
          {loading ? 'Loading…' : 'OK'}
        </button>
      </div>

      {periodError && (
        <p className="financial-period-bar__error">{periodError}</p>
      )}
    </div>
  );
}

export { getDefaultAppliedPeriod };
