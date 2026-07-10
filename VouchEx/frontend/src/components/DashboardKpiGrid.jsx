import {
  TrendingUp,
  TrendingDown,
  Receipt,
  CreditCard,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react';
import { formatINR } from '../utils/formatMoney';

const KPI_CONFIG = [
  {
    key: 'salesRevenue',
    label: 'Sales Revenue',
    icon: TrendingUp,
    variant: 'kpi-primary',
    accent: true,
    goodWhenUp: true,
    showCarryForward: false,
  },
  {
    key: 'cashInflow',
    label: 'Cash Inflow',
    icon: Receipt,
    variant: 'kpi-inflow',
    goodWhenUp: true,
    showCarryForward: true,
    carryKey: 'cashInflow',
  },
  {
    key: 'cashOutflow',
    label: 'Cash Outflow',
    icon: CreditCard,
    variant: 'kpi-outflow',
    goodWhenUp: false,
    showCarryForward: true,
    carryKey: 'cashOutflow',
  },
  {
    key: 'accountsReceivable',
    label: 'Accounts Receivables',
    icon: AlertTriangle,
    variant: 'kpi-receivable',
    goodWhenUp: false,
    showCarryForward: true,
    carryKey: 'accountsReceivable',
  },
  {
    key: 'accountsPayable',
    label: 'Accounts Payable',
    icon: TrendingDown,
    variant: 'kpi-payable',
    goodWhenUp: false,
    showCarryForward: true,
    carryKey: 'accountsPayable',
  },
  {
    key: 'grossProfit',
    label: 'Gross Profit',
    icon: TrendingUp,
    variant: 'kpi-profit',
    accent: true,
    goodWhenUp: true,
    showCarryForward: false,
    valueColor: (v) => (v >= 0 ? 'var(--kpi-green)' : 'var(--kpi-coral)'),
  },
];

function TrendBadge({ trend, goodWhenUp, trendLabel }) {
  const { pct, direction } = trend || { pct: 0, direction: 'flat' };
  if (direction === 'flat' || Math.abs(pct) < 0.1) {
    return (
      <span className="kpi-trend kpi-trend--flat">
        <Minus size={12} />
        <span>Stable {trendLabel}</span>
      </span>
    );
  }
  const isUp = direction === 'up';
  const positiveImpact = goodWhenUp ? isUp : !isUp;
  const sign = isUp ? '+' : '';
  const Icon = isUp ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`kpi-trend ${positiveImpact ? 'kpi-trend--positive' : 'kpi-trend--negative'}`}>
      <Icon size={13} />
      <span>{sign}{Math.abs(pct).toFixed(1)}% {trendLabel}</span>
    </span>
  );
}

export default function DashboardKpiGrid({ metrics }) {
  return (
    <div className="dashboard-kpi-grid">
      {KPI_CONFIG.map((cfg) => {
        const Icon = cfg.icon;
        const value = metrics[cfg.key] ?? 0;
        const trend = metrics.trends?.[cfg.key];
        const carryVal = cfg.carryKey ? metrics.carryForward?.[cfg.carryKey] : 0;
        const valueStyle = cfg.valueColor ? { color: cfg.valueColor(value) } : undefined;

        return (
          <article key={cfg.key} className={`kpi-card ${cfg.variant} kpi-card--accent`}>
            <div className="kpi-card__header">
              <span className="kpi-card__label">{cfg.label}</span>
              <div className="kpi-card__icon kpi-card__icon--glow">
                <Icon size={16} />
              </div>
            </div>
            <div className="kpi-card__value" style={valueStyle}>
              ₹{formatINR(value)}
            </div>
            <TrendBadge trend={trend} goodWhenUp={cfg.goodWhenUp} trendLabel={metrics.trendLabel || 'vs last period'} />
            {metrics.showCarryForward && cfg.showCarryForward && (
              <p className="kpi-card__carry">
                Includes ₹{formatINR(carryVal)} carried forward from previous periods
              </p>
            )}
          </article>
        );
      })}
    </div>
  );
}
