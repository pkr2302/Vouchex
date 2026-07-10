import { CalendarClock, FileJson, AlertCircle } from 'lucide-react';
import { formatDateDDMMYYYY, formatINR } from '../utils/formatMoney';

function daysLabel(days) {
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  if (days < 0) return `${Math.abs(days)}d overdue`;
  return `${days} days left`;
}

export default function DashboardComplianceStrip({
  compliance = {},
  gstReadiness = {},
  onNavigate,
}) {
  const { upcomingStatutory = [], overdueReminders = 0, dueThisWeek = 0, monthLabel } = compliance;
  const {
    periodLabel,
    outwardTaxable,
    itcEligible,
    invoiceCount,
    dataIssueCount,
    hasGstin,
    registeredState,
  } = gstReadiness;

  return (
    <section className="dashboard-compliance-strip">
      <div className="dashboard-compliance-strip__col">
        <div className="dashboard-compliance-strip__header">
          <CalendarClock size={16} />
          <h3 className="dashboard-section-title">Compliance snapshot</h3>
        </div>
        <p className="dashboard-section-subtitle">{monthLabel || 'Upcoming statutory dates'}</p>

        <div className="dashboard-compliance-strip__stats">
          {dueThisWeek > 0 && (
            <span className="dashboard-compliance-strip__badge dashboard-compliance-strip__badge--warn">
              {dueThisWeek} due this week
            </span>
          )}
          {overdueReminders > 0 && (
            <span className="dashboard-compliance-strip__badge dashboard-compliance-strip__badge--critical">
              {overdueReminders} overdue reminder(s)
            </span>
          )}
        </div>

        <ul className="dashboard-compliance-strip__list">
          {upcomingStatutory.length === 0 ? (
            <li className="dashboard-compliance-strip__empty">No upcoming statutory dates in range.</li>
          ) : (
            upcomingStatutory.map((ev) => (
              <li key={ev.id} className="dashboard-compliance-strip__item">
                <div>
                  <strong>{ev.title}</strong>
                  <span className="dashboard-compliance-strip__date">{formatDateDDMMYYYY(ev.date)}</span>
                </div>
                <span
                  className={`dashboard-compliance-strip__days${ev.daysLeft <= 3 ? ' dashboard-compliance-strip__days--urgent' : ''}`}
                >
                  {daysLabel(ev.daysLeft)}
                </span>
              </li>
            ))
          )}
        </ul>
      </div>

      <div className="dashboard-compliance-strip__col dashboard-compliance-strip__col--gst">
        <div className="dashboard-compliance-strip__header">
          <FileJson size={16} />
          <h3 className="dashboard-section-title">GST filing readiness</h3>
        </div>
        <p className="dashboard-section-subtitle">{periodLabel} return period</p>

        <dl className="dashboard-gst-readiness__metrics">
          <div>
            <dt>Outward taxable</dt>
            <dd>₹{formatINR(outwardTaxable)}</dd>
          </div>
          <div>
            <dt>ITC (purchases)</dt>
            <dd>₹{formatINR(itcEligible)}</dd>
          </div>
          <div>
            <dt>Invoices this month</dt>
            <dd>{invoiceCount}</dd>
          </div>
        </dl>

        {!hasGstin && (
          <p className="dashboard-gst-readiness__warn">
            <AlertCircle size={14} /> Add company GSTIN in Settings before export.
          </p>
        )}
        {hasGstin && !registeredState && (
          <p className="dashboard-gst-readiness__warn">
            <AlertCircle size={14} /> Registered state missing — IGST/CGST split may be wrong.
          </p>
        )}
        {dataIssueCount > 0 && (
          <p className="dashboard-gst-readiness__warn">
            <AlertCircle size={14} /> {dataIssueCount} invoice data issue(s) this month.
          </p>
        )}

        {onNavigate && (
          <button type="button" className="btn-secondary btn-secondary-sm" onClick={() => onNavigate('taxation')}>
            Open Taxation &amp; GSTR export
          </button>
        )}
      </div>
    </section>
  );
}
