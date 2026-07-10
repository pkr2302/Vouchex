import { useEffect, useState } from 'react';

const QUICK_PERIODS = ['Last Day', 'Last Month', 'Last Year'];

export default function DashboardTimeFilter({
  filterPeriod,
  setFilterPeriod,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate,
}) {
  const [customOpen, setCustomOpen] = useState(filterPeriod === 'Custom Range');

  useEffect(() => {
    setCustomOpen(filterPeriod === 'Custom Range');
  }, [filterPeriod]);

  return (
    <div className="dashboard-time-filter">
      <div className="dashboard-time-filter__pills">
        {QUICK_PERIODS.map((period) => (
          <button
            key={period}
            type="button"
            className={`dashboard-time-filter__pill${filterPeriod === period ? ' dashboard-time-filter__pill--active' : ''}`}
            onClick={() => setFilterPeriod(period)}
          >
            {period}
          </button>
        ))}
        <button
          type="button"
          className={`dashboard-time-filter__pill${filterPeriod === 'Custom Range' ? ' dashboard-time-filter__pill--active' : ''}`}
          onClick={() => setFilterPeriod('Custom Range')}
        >
          Custom
        </button>
      </div>
      <div className={`dashboard-time-filter__custom${customOpen ? ' dashboard-time-filter__custom--open' : ''}`}>
        <input
          type="date"
          className="date-input"
          value={customStartDate}
          onChange={(e) => setCustomStartDate(e.target.value)}
          aria-label="Start date"
        />
        <span>to</span>
        <input
          type="date"
          className="date-input"
          value={customEndDate}
          onChange={(e) => setCustomEndDate(e.target.value)}
          aria-label="End date"
        />
      </div>
    </div>
  );
}
