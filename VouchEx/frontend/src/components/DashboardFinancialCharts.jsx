import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  Area,
  AreaChart,
  PieChart,
  Pie,
  Legend,
} from 'recharts';
import { formatINR } from '../utils/formatMoney';
import {
  buildWaterfallChartData,
  buildInflowOutflowGroups,
  buildMonthlyTrajectory,
  buildExpenseBreakdown,
  buildWorkingCapitalMetrics,
  workingCapitalZone,
  isDateInPeriod,
  DASHBOARD_REFERENCE_DATE,
} from '../utils/dashboardMetrics';

const CHART_TYPES = [
  { id: 'waterfall', label: 'Cash Flow Waterfall' },
  { id: 'inflow-outflow', label: 'Inflows vs Outflows' },
  { id: 'trajectory', label: 'Financial Trajectory' },
  { id: 'expense-donut', label: 'Expense Breakdown' },
  { id: 'working-capital', label: 'Working Capital' },
];

const COLORS = {
  primary: '#3730a3',
  inflow: '#0d9488',
  outflow: '#b45454',
  neutral: '#94a3b8',
  profit: '#334155',
  grid: 'rgba(148, 163, 184, 0.35)',
};

const DONUT_PALETTE = ['#3730a3', '#0d9488', '#475569', '#64748b', '#b45454', '#78716c', '#0369a1', '#94a3b8'];

function GlassTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-glass-tooltip">
      {label && <div className="chart-glass-tooltip__title">{label}</div>}
      {payload.map((entry) => (
        <div key={`${entry.name}-${entry.dataKey}`} className="chart-glass-tooltip__row">
          <span style={{ color: entry.color || entry.fill }}>{entry.name}</span>
          <strong>₹{formatINR(entry.value)}</strong>
        </div>
      ))}
    </div>
  );
}

function WaterfallTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload.find((p) => p.dataKey === 'value')?.payload;
  if (!row) return null;
  const signed = row.signed ?? row.value;
  return (
    <div className="chart-glass-tooltip">
      <div className="chart-glass-tooltip__title">{row.name}</div>
      <div className="chart-glass-tooltip__row">
        <span>Amount</span>
        <strong>{signed < 0 ? '−' : ''}₹{formatINR(Math.abs(signed))}</strong>
      </div>
    </div>
  );
}

function WaterfallBars({ data }) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 16, right: 12, left: 4, bottom: 8 }} barCategoryGap="18%">
        <CartesianGrid strokeDasharray="4 4" stroke={COLORS.grid} vertical={false} />
        <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fill: '#64748b', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip content={<WaterfallTooltip />} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
        <Bar dataKey="base" stackId="wf" fill="transparent" isAnimationActive animationDuration={700} />
        <Bar dataKey="value" stackId="wf" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={700}>
          {data.map((entry) => (
            <Cell
              key={entry.name}
              fill={
                entry.kind === 'total'
                  ? entry.name === 'Net Profit'
                    ? COLORS.inflow
                    : COLORS.primary
                  : entry.kind === 'gain'
                    ? COLORS.inflow
                    : COLORS.outflow
              }
              style={{ filter: 'drop-shadow(0 2px 4px rgba(15,23,42,0.12))' }}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function InflowOutflowChart({ groups }) {
  const flat = groups.flatMap((g) => [
    { name: `${g.group} — In`, group: g.group, type: 'Inflow', amount: g.inflow },
    { name: `${g.group} — Out`, group: g.group, type: 'Outflow', amount: g.outflow },
  ]);

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={flat} margin={{ top: 16, right: 12, left: 4, bottom: 8 }} barGap={4} barCategoryGap="22%">
        <CartesianGrid strokeDasharray="4 4" stroke={COLORS.grid} vertical={false} />
        <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} interval={0} angle={-12} textAnchor="end" height={56} />
        <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
        <Tooltip content={<GlassTooltip />} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
        <Legend wrapperStyle={{ fontSize: 12, color: '#64748b' }} />
        <Bar dataKey="amount" name="Amount" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={700}>
          {flat.map((entry) => (
            <Cell
              key={entry.name}
              fill={entry.type === 'Inflow' ? COLORS.primary : COLORS.outflow}
              style={{ filter: 'drop-shadow(0 2px 4px rgba(15,23,42,0.1))' }}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function TrajectoryChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart data={data} margin={{ top: 16, right: 12, left: 4, bottom: 8 }}>
        <defs>
          <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLORS.primary} stopOpacity={0.22} />
            <stop offset="100%" stopColor={COLORS.primary} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLORS.outflow} stopOpacity={0.18} />
            <stop offset="100%" stopColor={COLORS.outflow} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="4 4" stroke={COLORS.grid} vertical={false} />
        <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
        <Tooltip content={<GlassTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Area type="monotone" dataKey="revenue" name="Revenue" stroke={COLORS.primary} fill="url(#revGrad)" strokeWidth={2.5} dot={false} isAnimationActive animationDuration={800} />
        <Area type="monotone" dataKey="expenses" name="Expenses" stroke={COLORS.outflow} fill="url(#expGrad)" strokeWidth={2.5} dot={false} isAnimationActive animationDuration={800} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function ExpenseDonut({ data }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!data.length) {
    return <p className="chart-empty-state">No expense data for the selected period.</p>;
  }
  return (
    <div className="chart-donut-wrap">
      <ResponsiveContainer width="100%" height={320}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius="62%"
            outerRadius="78%"
            paddingAngle={2}
            stroke="rgba(255,255,255,0.6)"
            strokeWidth={2}
            isAnimationActive
            animationDuration={700}
          >
            {data.map((entry, idx) => (
              <Cell key={entry.name} fill={DONUT_PALETTE[idx % DONUT_PALETTE.length]} style={{ filter: 'drop-shadow(0 2px 3px rgba(15,23,42,0.1))' }} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const row = payload[0].payload;
              return (
                <div className="chart-glass-tooltip">
                  <div className="chart-glass-tooltip__title">{row.name}</div>
                  <div className="chart-glass-tooltip__row">
                    <span>Share</span>
                    <strong>₹{formatINR(row.value)}</strong>
                  </div>
                </div>
              );
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="chart-donut-center">
        <span className="chart-donut-center__label">Total Exp</span>
        <strong>₹{formatINR(total)}</strong>
      </div>
    </div>
  );
}

function WorkingCapitalChart({ metrics }) {
  const rows = buildWorkingCapitalMetrics(metrics);
  return (
    <div className="wc-health-list">
      {rows.map((row) => {
        const lowerBetter = row.id === 'debt-income' || row.id === 'recv-pay';
        const zone = workingCapitalZone(row.value, row.target, row.warn, row.critical, lowerBetter);
        const pct = Math.min(100, Math.max(8, (row.value / (row.critical || 1)) * 100));
        const displayVal = row.isCurrency ? `₹${formatINR(row.display)}` : row.display;
        return (
          <div key={row.id} className="wc-health-row">
            <div className="wc-health-row__head">
              <span>{row.label}</span>
              <strong>{displayVal}</strong>
            </div>
            <div className="wc-health-track">
              <div className={`wc-health-fill wc-health-fill--${zone}`} style={{ width: `${pct}%` }} />
              <span className="wc-health-marker" style={{ left: `${Math.min(92, row.target / (row.critical || 1) * 100)}%` }} title="Target" />
            </div>
            <p className="wc-health-caption">{row.caption}</p>
          </div>
        );
      })}
    </div>
  );
}

export default function DashboardFinancialCharts({
  metrics,
  invoices,
  expenses,
  filterPeriod,
  customStartDate,
  customEndDate,
  embedded = false,
}) {
  const [activeChart, setActiveChart] = useState('waterfall');

  const waterfallData = useMemo(() => buildWaterfallChartData(metrics), [metrics]);
  const inflowGroups = useMemo(() => buildInflowOutflowGroups(metrics), [metrics]);
  const trajectory = useMemo(() => buildMonthlyTrajectory(invoices, expenses), [invoices, expenses]);
  const expenseBreakdown = useMemo(() => {
    const inPeriod = (d) => isDateInPeriod(d, filterPeriod, DASHBOARD_REFERENCE_DATE, customStartDate, customEndDate);
    return buildExpenseBreakdown(expenses, inPeriod);
  }, [expenses, filterPeriod, customStartDate, customEndDate]);

  const activeMeta = CHART_TYPES.find((c) => c.id === activeChart);

  return (
    <div className={embedded ? 'fin-chart-card fin-chart-card--embedded' : 'fin-chart-card'}>
      {!embedded && (
        <div className="fin-chart-card__header">
          <div>
            <h3 className="chart-title">Financial Analytics</h3>
            <p className="fin-chart-card__subtitle">{activeMeta?.label}</p>
          </div>
          <div className="fin-chart-selector">
            {CHART_TYPES.map((type) => (
              <button
                key={type.id}
                type="button"
                className={`fin-chart-pill${activeChart === type.id ? ' fin-chart-pill--active' : ''}`}
                onClick={() => setActiveChart(type.id)}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {embedded && (
        <div className="fin-chart-card__header fin-chart-card__header--embedded">
          <p className="fin-chart-card__subtitle">{activeMeta?.label}</p>
          <div className="fin-chart-selector">
            {CHART_TYPES.map((type) => (
              <button
                key={type.id}
                type="button"
                className={`fin-chart-pill${activeChart === type.id ? ' fin-chart-pill--active' : ''}`}
                onClick={() => setActiveChart(type.id)}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="fin-chart-card__body" key={activeChart}>
        {activeChart === 'waterfall' && <WaterfallBars data={waterfallData} />}
        {activeChart === 'inflow-outflow' && <InflowOutflowChart groups={inflowGroups} />}
        {activeChart === 'trajectory' && <TrajectoryChart data={trajectory} />}
        {activeChart === 'expense-donut' && <ExpenseDonut data={expenseBreakdown} />}
        {activeChart === 'working-capital' && <WorkingCapitalChart metrics={metrics} />}
      </div>
    </div>
  );
}
