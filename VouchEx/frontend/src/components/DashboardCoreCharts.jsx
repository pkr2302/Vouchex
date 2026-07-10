import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Area,
  AreaChart,
} from 'recharts';
import { formatINR } from '../utils/formatMoney';
import { formatRupee } from '../utils/dashboardMetrics';

const PALETTE = ['#3730a3', '#475569', '#0d9488', '#64748b', '#334155', '#78716c', '#0369a1', '#94a3b8'];
const COLORS = {
  overdue: '#b45454',
  neutral: '#94a3b8',
  notDeposited: '#6ee7b7',
  deposited: '#0f766e',
  income: '#0d9488',
  expense: '#3730a3',
  sales: '#334155',
  grid: 'rgba(148, 163, 184, 0.35)',
};

function GlassTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-glass-tooltip">
      {label && <div className="chart-glass-tooltip__title">{label}</div>}
      {payload.map((entry) => (
        <div key={entry.name} className="chart-glass-tooltip__row">
          <span>{entry.name}</span>
          <strong>{formatRupee(entry.value)}</strong>
        </div>
      ))}
    </div>
  );
}

function ProgressTrack({ label, total, segments }) {
  const safeTotal = Math.max(total, 1);
  return (
    <div className="dash-progress-track">
      <div className="dash-progress-track__head">
        <span>{label}</span>
        <strong>{formatRupee(total)}</strong>
      </div>
      <div className="dash-progress-track__bar">
        {segments.map((seg) => (
          <div
            key={seg.key}
            className="dash-progress-track__seg"
            style={{ width: `${(seg.value / safeTotal) * 100}%`, background: seg.color }}
            title={`${seg.label}: ${formatRupee(seg.value)}`}
          />
        ))}
      </div>
      <div className="dash-progress-track__legend">
        {segments.map((seg) => (
          <span key={seg.key}>
            <i style={{ background: seg.color }} />
            {seg.label} {formatRupee(seg.value)}
          </span>
        ))}
      </div>
    </div>
  );
}

export function InvoicesReceivablesPanel({ data }) {
  const { unpaid, paid } = data;
  return (
    <div className="dash-panel__chart dash-panel__chart--compact">
      <ProgressTrack
        label="Unpaid pipeline"
        total={unpaid.total}
        segments={[
          { key: 'overdue', label: 'Overdue', value: unpaid.overdue, color: COLORS.overdue },
          { key: 'notDue', label: 'Not due yet', value: unpaid.notDue, color: COLORS.neutral },
        ]}
      />
      <ProgressTrack
        label="Paid collections (period)"
        total={paid.total}
        segments={[
          { key: 'notDep', label: 'Not deposited', value: paid.notDeposited, color: COLORS.notDeposited },
          { key: 'dep', label: 'Deposited', value: paid.deposited, color: COLORS.deposited },
        ]}
      />
    </div>
  );
}

export function ExpenseBreakdownCorePanel({ data }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!data.length) {
    return <p className="chart-empty-state">No expenses in this period.</p>;
  }
  return (
    <div className="dash-donut-layout">
      <div className="dash-donut-layout__chart">
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="68%"
              outerRadius="82%"
              paddingAngle={2}
              stroke="rgba(255,255,255,0.65)"
              strokeWidth={2}
              isAnimationActive
              animationDuration={650}
            >
              {data.map((entry, idx) => (
                <Cell key={entry.name} fill={PALETTE[idx % PALETTE.length]} />
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
                      <span>Amount</span>
                      <strong>{formatRupee(row.value)}</strong>
                    </div>
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="chart-donut-center">
          <span className="chart-donut-center__label">{formatRupee(total)}</span>
          <strong>Total</strong>
        </div>
      </div>
      <ul className="dash-donut-legend">
        {data.map((row, idx) => (
          <li key={row.name}>
            <i style={{ background: PALETTE[idx % PALETTE.length] }} />
            <span>{row.name}</span>
            <strong>{formatRupee(row.value)}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ProfitLossPanel({ data }) {
  const maxVal = Math.max(data.income, data.expenses, 1);
  return (
    <div className="dash-pl-panel">
      <div className="dash-pl-panel__head">
        <span>Business Profit</span>
        <strong className={data.netProfit >= 0 ? 'dash-pl-panel__profit--pos' : 'dash-pl-panel__profit--neg'}>
          {formatRupee(data.netProfit)}
        </strong>
      </div>
      <div className="dash-pl-bar-wrap">
        <div className="dash-pl-bar-label">
          <span>Income / Sales</span>
          <strong>{formatRupee(data.income)}</strong>
        </div>
        <div className="dash-pl-bar dash-pl-bar--income" style={{ width: `${(data.income / maxVal) * 100}%` }} />
      </div>
      <div className="dash-pl-bar-wrap">
        <div className="dash-pl-bar-label">
          <span>Spending / Expenses</span>
          <strong>{formatRupee(data.expenses)}</strong>
        </div>
        <div className="dash-pl-bar dash-pl-bar--expense" style={{ width: `${(data.expenses / maxVal) * 100}%` }} />
      </div>
    </div>
  );
}

export function SalesTrajectoryPanel({ data }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 12, right: 8, left: 0, bottom: 4 }}>
        <defs>
          <linearGradient id="salesTrajGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLORS.sales} stopOpacity={0.2} />
            <stop offset="100%" stopColor={COLORS.sales} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="4 4" stroke={COLORS.grid} vertical={false} />
        <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fill: '#64748b', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
          width={48}
        />
        <Tooltip content={<GlassTooltip />} />
        <Area
          type="monotone"
          dataKey="sales"
          name="Sales"
          stroke={COLORS.sales}
          fill="url(#salesTrajGrad)"
          strokeWidth={2.5}
          dot={{ r: 4, fill: COLORS.sales, stroke: '#fff', strokeWidth: 2 }}
          activeDot={{ r: 5 }}
          isAnimationActive
          animationDuration={700}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
