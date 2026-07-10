import { ArrowUpRight, ArrowDownRight, Minus, ExternalLink } from 'lucide-react';
import { formatINR } from '../utils/formatMoney';

function TrendHint({ trend }) {
  if (!trend) return null;
  const { pct, direction } = trend;
  if (direction === 'flat' || Math.abs(pct) < 0.1) {
    return (
      <span className="dashboard-mini-kpi__trend dashboard-mini-kpi__trend--flat">
        <Minus size={11} /> Stable
      </span>
    );
  }
  const up = direction === 'up';
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`dashboard-mini-kpi__trend ${up ? 'dashboard-mini-kpi__trend--up' : 'dashboard-mini-kpi__trend--down'}`}>
      <Icon size={11} />
      {up ? '+' : ''}{Math.abs(pct).toFixed(0)}%
    </span>
  );
}

export default function DashboardMiniKpiStrip({ kpis = [], onOpen360 }) {
  return (
    <section className="dashboard-mini-kpi">
      <div className="dashboard-mini-kpi__header">
        <div>
          <h3 className="dashboard-section-title">At a glance</h3>
          <p className="dashboard-section-subtitle">Key numbers for the current period</p>
        </div>
        {onOpen360 && (
          <button type="button" className="dashboard-mini-kpi__link-btn" onClick={onOpen360}>
            Company 360° <ExternalLink size={13} />
          </button>
        )}
      </div>
      <div className="dashboard-mini-kpi__grid">
        {kpis.map((kpi) => (
          <article key={kpi.key} className="dashboard-mini-kpi__tile">
            <span className="dashboard-mini-kpi__label">{kpi.label}</span>
            <div className="dashboard-mini-kpi__value-row">
              <span className="dashboard-mini-kpi__value">
                {kpi.unavailable ? '—' : `₹${formatINR(kpi.value ?? 0)}`}
              </span>
              <TrendHint trend={kpi.trend} />
            </div>
            {kpi.unavailable && (
              <span className="dashboard-mini-kpi__hint">Add bank/cash ledgers in COA</span>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
