import { AlertTriangle, CheckCircle2, ChevronRight, Info } from 'lucide-react';
import { formatINR } from '../utils/formatMoney';

const SEVERITY_ICON = {
  critical: AlertTriangle,
  warning: AlertTriangle,
  info: Info,
  ok: CheckCircle2,
};

export default function DashboardAttentionPanel({ items = [], onNavigate }) {
  return (
    <section className="dashboard-attention">
      <div className="dashboard-attention__header">
        <h3 className="dashboard-section-title">Needs attention</h3>
        <p className="dashboard-section-subtitle">Exceptions and follow-ups for today</p>
      </div>
      <div className="dashboard-attention__grid">
        {items.map((item) => {
          const Icon = SEVERITY_ICON[item.severity] || Info;
          const clickable = item.tab && onNavigate;
          return (
            <article
              key={item.id}
              className={`dashboard-attention__card dashboard-attention__card--${item.severity}${clickable ? ' dashboard-attention__card--clickable' : ''}`}
              role={clickable ? 'button' : undefined}
              tabIndex={clickable ? 0 : undefined}
              onClick={clickable ? () => onNavigate(item.tab) : undefined}
              onKeyDown={
                clickable
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onNavigate(item.tab);
                      }
                    }
                  : undefined
              }
            >
              <div className="dashboard-attention__card-top">
                <span className={`dashboard-attention__icon dashboard-attention__icon--${item.severity}`}>
                  <Icon size={16} />
                </span>
                {item.count != null && (
                  <span className="dashboard-attention__count">{item.count}</span>
                )}
              </div>
              <strong className="dashboard-attention__title">{item.title}</strong>
              <p className="dashboard-attention__detail">{item.detail}</p>
              {item.amount != null && item.amount > 0 && (
                <p className="dashboard-attention__amount">₹{formatINR(item.amount)}</p>
              )}
              {clickable && (
                <span className="dashboard-attention__link">
                  Open <ChevronRight size={14} />
                </span>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
