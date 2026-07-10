import { formatDateDDMMYYYY, formatINR } from '../utils/formatMoney';

export default function DashboardRecentActivity({ events = [], onNavigate }) {
  return (
    <section className="dashboard-recent-activity">
      <div className="dashboard-recent-activity__header">
        <h3 className="dashboard-section-title">Recent activity</h3>
        <p className="dashboard-section-subtitle">Latest books entries across modules</p>
      </div>
      {events.length === 0 ? (
        <p className="dashboard-recent-activity__empty">No transactions recorded yet.</p>
      ) : (
        <ul className="dashboard-recent-activity__list">
          {events.map((ev) => (
            <li key={ev.id} className="dashboard-recent-activity__item">
              <div className="dashboard-recent-activity__main">
                <span className="dashboard-recent-activity__type">{ev.meta?.label || ev.type}</span>
                <strong>{ev.title}</strong>
                <span className="dashboard-recent-activity__sub">{ev.subtitle}</span>
              </div>
              <div className="dashboard-recent-activity__meta">
                <span>{formatDateDDMMYYYY(ev.date)}</span>
                <strong>₹{formatINR(ev.amount)}</strong>
                {onNavigate && ev.meta?.tab && (
                  <button
                    type="button"
                    className="dashboard-recent-activity__open"
                    onClick={() => onNavigate(ev.meta.tab)}
                  >
                    View
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
