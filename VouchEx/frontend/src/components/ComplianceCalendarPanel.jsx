import React, { useMemo, useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, Filter, Plus } from 'lucide-react';
import { formatDateDDMMYYYY, dateOnly } from '../utils/formatMoney';
import { Modal } from './portalShared';
import {
  STATUTORY_EVENTS,
  STATUTORY_DISCLAIMER,
  CALENDAR_FILTERS,
  filterStatutoryEvents,
  statutoryColorClass,
} from '../data/statutoryDueDates';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function monthMatrix(year, month) {
  const first = new Date(year, month - 1, 1);
  const startPad = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells = [];
  for (let i = 0; i < startPad; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) {
    cells.push(dateOnly(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function ComplianceCalendarPanel({ calendarReminders = [], onAddTask, onAddReminder }) {
  const [viewYear, setViewYear] = useState(2026);
  const [viewMonth, setViewMonth] = useState(6);
  const [activeFilters, setActiveFilters] = useState(['all']);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedStatutory, setSelectedStatutory] = useState(null);
  const [dayModalDate, setDayModalDate] = useState(null);
  const filterRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const statutoryFiltered = useMemo(
    () => filterStatutoryEvents(STATUTORY_EVENTS, activeFilters),
    [activeFilters]
  );

  const statutoryByDate = useMemo(() => {
    const map = {};
    statutoryFiltered.forEach((ev) => {
      if (!map[ev.date]) map[ev.date] = [];
      map[ev.date].push(ev);
    });
    return map;
  }, [statutoryFiltered]);

  const userByDate = useMemo(() => {
    const map = {};
    calendarReminders.forEach((r) => {
      const d = dateOnly(r.reminder_date);
      if (!map[d]) map[d] = [];
      map[d].push(r);
    });
    return map;
  }, [calendarReminders]);

  const cells = useMemo(() => monthMatrix(viewYear, viewMonth), [viewYear, viewMonth]);

  const toggleFilter = (id) => {
    if (id === 'all') {
      setActiveFilters(['all']);
      return;
    }
    setActiveFilters((prev) => {
      const base = prev.filter((f) => f !== 'all');
      if (base.includes(id)) {
        const next = base.filter((f) => f !== id);
        return next.length ? next : ['all'];
      }
      return [...base, id];
    });
  };

  const shiftMonth = (delta) => {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 1) {
      m = 12;
      y -= 1;
    } else if (m > 12) {
      m = 1;
      y += 1;
    }
    setViewMonth(m);
    setViewYear(y);
  };

  const filterLabel =
    activeFilters.includes('all') || activeFilters.length === 0
      ? 'All statutory dates'
      : `${activeFilters.length} filter${activeFilters.length > 1 ? 's' : ''} active`;

  const dayStatutory = dayModalDate ? statutoryByDate[dayModalDate] || [] : [];
  const dayUser = dayModalDate ? userByDate[dayModalDate] || [] : [];

  return (
    <div className="compliance-calendar-panel">
      <p className="tax-calendar-lead">
        Statutory GST, TDS, and Income Tax due dates. Your tasks appear in{' '}
        <strong style={{ color: 'var(--accent-amber)' }}>amber</strong> on the grid.
      </p>

      <div className="compliance-calendar-toolbar">
        <div className="statutory-filter-dropdown" ref={filterRef}>
          <button
            type="button"
            className="btn-secondary statutory-filter-btn"
            onClick={() => setFilterOpen((o) => !o)}
          >
            <Filter size={14} />
            Statutory filters
            <span className="statutory-filter-btn__hint">{filterLabel}</span>
            <ChevronDown size={14} />
          </button>
          {filterOpen && (
            <div className="statutory-filter-menu">
              {CALENDAR_FILTERS.map((f) => (
                <label key={f.id} className="statutory-filter-option">
                  <input
                    type="checkbox"
                    checked={activeFilters.includes(f.id) || (f.id === 'all' && activeFilters.includes('all'))}
                    onChange={() => toggleFilter(f.id)}
                  />
                  <span>{f.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="tax-calendar-legend compliance-calendar-legend">
          <span><i className="tax-cal-dot tax-cal-dot--gst" /> GST</span>
          <span><i className="tax-cal-dot tax-cal-dot--gst-light" /> QRMP</span>
          <span><i className="tax-cal-dot tax-cal-dot--gst-tds" /> GST TDS</span>
          <span><i className="tax-cal-dot tax-cal-dot--tds" /> IT TDS</span>
          <span><i className="tax-cal-dot tax-cal-dot--income-tax" /> Income Tax</span>
          <span><i className="tax-cal-dot tax-cal-dot--roc" /> ROC</span>
          <span><i className="tax-cal-dot tax-cal-dot--user" /> Your task / reminder</span>
        </div>
      </div>

      <div className="tax-calendar-toolbar">
        <button type="button" className="btn-secondary" onClick={() => shiftMonth(-1)} aria-label="Previous month">
          <ChevronLeft size={18} />
        </button>
        <h3 className="tax-calendar-month-title">
          {new Date(viewYear, viewMonth - 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' })}
        </h3>
        <button type="button" className="btn-secondary" onClick={() => shiftMonth(1)} aria-label="Next month">
          <ChevronRight size={18} />
        </button>
        <div className="compliance-calendar-actions">
          <button type="button" className="btn-primary" onClick={onAddTask}>
            <Plus size={14} /> Add Task
          </button>
          <button type="button" className="btn-secondary" onClick={onAddReminder}>
            <Plus size={14} /> Add Reminder
          </button>
        </div>
      </div>

      <div className="tax-calendar-grid compliance-calendar-grid">
        {WEEKDAYS.map((w) => (
          <div key={w} className="tax-calendar-weekday">
            {w}
          </div>
        ))}
        {cells.map((dateStr, idx) => {
          if (!dateStr) {
            return <div key={`empty-${idx}`} className="tax-calendar-cell tax-calendar-cell--empty" />;
          }
          const stat = statutoryByDate[dateStr] || [];
          const user = userByDate[dateStr] || [];
          return (
            <button
              key={dateStr}
              type="button"
              className="tax-calendar-cell"
              onClick={() => setDayModalDate(dateStr)}
            >
              <span className="tax-calendar-day-num">{parseInt(dateStr.slice(8), 10)}</span>
              <div className="tax-calendar-dots">
                {stat.slice(0, 4).map((ev) => (
                  <i
                    key={ev.id}
                    className={`tax-cal-dot ${statutoryColorClass(ev.color)}`}
                    title={ev.title}
                  />
                ))}
                {stat.length > 4 && <span className="tax-cal-more">+{stat.length - 4}</span>}
                {user.map((r) => (
                  <i key={r.id} className="tax-cal-dot tax-cal-dot--user" title={r.title} />
                ))}
              </div>
            </button>
          );
        })}
      </div>

      <Modal
        open={Boolean(selectedStatutory)}
        title={selectedStatutory?.title || 'Compliance due date'}
        onClose={() => setSelectedStatutory(null)}
        width={560}
        variant="solid"
      >
        {selectedStatutory && (
          <div className="tax-cal-detail">
            <p><strong>Date:</strong> {formatDateDDMMYYYY(selectedStatutory.date)}</p>
            <p>{selectedStatutory.description}</p>
            <p className="tax-cal-disclaimer">{STATUTORY_DISCLAIMER}</p>
            <p>
              Verify on:{' '}
              <a href={selectedStatutory.officialUrl} target="_blank" rel="noopener noreferrer">
                {selectedStatutory.officialLabel}
              </a>
            </p>
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(dayModalDate)}
        title={dayModalDate ? formatDateDDMMYYYY(dayModalDate) : ''}
        onClose={() => setDayModalDate(null)}
        width={640}
        variant="solid"
      >
        {dayModalDate && (
          <div className="tax-cal-day-modal">
            {dayStatutory.length > 0 && (
              <>
                <h5>Statutory due dates</h5>
                <ul className="tax-cal-day-list">
                  {dayStatutory.map((ev) => (
                    <li key={ev.id}>
                      <button
                        type="button"
                        className="tax-cal-day-link"
                        onClick={() => {
                          setSelectedStatutory(ev);
                          setDayModalDate(null);
                        }}
                      >
                        <i className={`tax-cal-dot ${statutoryColorClass(ev.color)}`} />
                        {ev.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {dayUser.length > 0 && (
              <>
                <h5>Your tasks & reminders</h5>
                <ul className="tax-cal-day-list">
                  {dayUser.map((r) => (
                    <li key={r.id}>
                      <i className="tax-cal-dot tax-cal-dot--user" />
                      <strong>{r.title}</strong>
                      <span className="tax-cal-meta">
                        {r.reminder_time} · {r.kind}
                        {r.priority ? ` · Priority ${r.priority}` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {dayStatutory.length === 0 && dayUser.length === 0 && (
              <p style={{ color: '#666' }}>No events on this date for current filters.</p>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <button type="button" className="btn-primary" onClick={() => { onAddTask(dayModalDate); setDayModalDate(null); }}>
                Add task
              </button>
              <button type="button" className="btn-secondary" onClick={() => { onAddReminder(dayModalDate); setDayModalDate(null); }}>
                Add reminder
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
