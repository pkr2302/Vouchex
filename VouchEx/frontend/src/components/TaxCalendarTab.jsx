import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Mail, Plus, Trash2, Pencil } from 'lucide-react';
import { useSimulator } from '../context/SimulatorContext';
import { formatDateDDMMYYYY, dateOnly } from '../utils/formatMoney';
import { showApiError } from '../utils/apiErrors';
import { Modal, Req } from './portalShared';
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

const emptyForm = (email) => ({
  id: null,
  kind: 'reminder',
  title: '',
  notes: '',
  reminder_date: dateOnly(new Date().toISOString()),
  reminder_time: '09:00',
  notify_email: email || '',
});

export function TaxCalendarTab() {
  const {
    calendarReminders,
    createCalendarReminder,
    updateCalendarReminder,
    deleteCalendarReminder,
    currentUser,
    companyDetails,
    addConsoleLog,
  } = useSimulator();

  const [section, setSection] = useState('calendar');
  const [viewYear, setViewYear] = useState(2026);
  const [viewMonth, setViewMonth] = useState(6);
  const [activeFilters, setActiveFilters] = useState(['all']);
  const [selectedStatutory, setSelectedStatutory] = useState(null);
  const [dayModalDate, setDayModalDate] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(() => emptyForm(currentUser?.email));
  const [saving, setSaving] = useState(false);

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
    (calendarReminders || []).forEach((r) => {
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

  const openCreate = (dateStr) => {
    setForm({
      ...emptyForm(currentUser?.email || companyDetails?.email),
      reminder_date: dateStr || dateOnly(new Date().toISOString()),
    });
    setFormOpen(true);
    setSection('manage');
  };

  const openEdit = (row) => {
    setForm({
      id: row.id,
      kind: row.kind,
      title: row.title,
      notes: row.notes || '',
      reminder_date: dateOnly(row.reminder_date),
      reminder_time: row.reminder_time || '09:00',
      notify_email: row.notify_email,
    });
    setFormOpen(true);
    setSection('manage');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      alert('Title is required.');
      return;
    }
    if (!form.notify_email.trim()) {
      alert('Email address for notification is required.');
      return;
    }
    setSaving(true);
    const payload = {
      kind: form.kind,
      title: form.title.trim(),
      notes: form.notes.trim() || null,
      reminder_date: dateOnly(form.reminder_date),
      reminder_time: form.reminder_time,
      notify_email: form.notify_email.trim(),
    };
    try {
      if (form.id) {
        await updateCalendarReminder(form.id, payload);
        addConsoleLog('route', `PUT /api/tax-calendar/reminders/${form.id}`, 'Calendar reminder updated.');
      } else {
        await createCalendarReminder(payload);
        addConsoleLog('route', 'POST /api/tax-calendar/reminders', 'Calendar reminder created; email scheduled on server.');
      }
      setFormOpen(false);
      setForm(emptyForm(currentUser?.email));
    } catch (err) {
      showApiError('Saving calendar reminder', err);
    }
    setSaving(false);
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete "${row.title}"?`)) return;
    try {
      await deleteCalendarReminder(row.id);
      addConsoleLog('route', `DELETE /api/tax-calendar/reminders/${row.id}`, 'Calendar reminder removed.');
    } catch (err) {
      showApiError('Deleting calendar reminder', err);
    }
  };

  const tasks = (calendarReminders || []).filter((r) => r.kind === 'task');
  const reminders = (calendarReminders || []).filter((r) => r.kind === 'reminder');

  const dayStatutory = dayModalDate ? statutoryByDate[dayModalDate] || [] : [];
  const dayUser = dayModalDate ? userByDate[dayModalDate] || [] : [];

  return (
    <div className="tax-calendar-tab">
      <div className="tab-nav-sub">
        <button
          type="button"
          className={`sub-tab-btn ${section === 'calendar' ? 'active' : ''}`}
          onClick={() => setSection('calendar')}
        >
          Compliance Calendar
        </button>
        <button
          type="button"
          className={`sub-tab-btn ${section === 'manage' ? 'active' : ''}`}
          onClick={() => setSection('manage')}
        >
          My Tasks & Reminders
        </button>
      </div>

      {section === 'calendar' && (
        <>
          <p className="tax-calendar-lead">
            Statutory GST, TDS, and Income Tax due dates (curated). Your personal tasks appear in{' '}
            <strong style={{ color: 'var(--accent-amber)' }}>amber</strong>; tap a day for details.
            Email alerts are sent automatically at the scheduled time (server cron).
          </p>

          <div className="tax-calendar-filters">
            {CALENDAR_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`tax-cal-filter-chip ${activeFilters.includes(f.id) ? 'active' : ''}`}
                onClick={() => toggleFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="tax-calendar-legend">
            <span><i className="tax-cal-dot tax-cal-dot--gst" /> GST</span>
            <span><i className="tax-cal-dot tax-cal-dot--gst-light" /> QRMP</span>
            <span><i className="tax-cal-dot tax-cal-dot--gst-tds" /> GST TDS</span>
            <span><i className="tax-cal-dot tax-cal-dot--tds" /> IT TDS</span>
            <span><i className="tax-cal-dot tax-cal-dot--income-tax" /> Income Tax</span>
            <span><i className="tax-cal-dot tax-cal-dot--roc" /> ROC</span>
            <span><i className="tax-cal-dot tax-cal-dot--user" /> Your task / reminder</span>
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
            <button type="button" className="btn-primary" style={{ marginLeft: 'auto' }} onClick={() => openCreate()}>
              <Plus size={14} /> Add reminder
            </button>
          </div>

          <div className="tax-calendar-grid">
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
        </>
      )}

      {section === 'manage' && (
        <div className="tax-calendar-manage">
          <div className="table-header-row">
            <h3>Tasks & email reminders</h3>
            <button type="button" className="btn-primary" onClick={() => openCreate()}>
              <Plus size={14} /> Add new
            </button>
          </div>
          <p className="tax-calendar-lead">
            <Mail size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
            Emails are sent by the server when the portal is closed. Configure SMTP in Laravel{' '}
            <code>MAIL_*</code> on cPanel and run <code>php artisan schedule:run</code> every minute.
          </p>

          {formOpen && (
            <form className="master-form tax-calendar-form" onSubmit={handleSave}>
              <h4 className="form-section-title">{form.id ? 'Edit entry' : 'New task or reminder'}</h4>
              <div className="form-grid-3">
                <div className="form-group">
                  <Req>Type</Req>
                  <select
                    className="form-input"
                    value={form.kind}
                    onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))}
                  >
                    <option value="reminder">Reminder</option>
                    <option value="task">Task</option>
                  </select>
                </div>
                <div className="form-group">
                  <Req>Title</Req>
                  <input
                    className="form-input"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. File GSTR-3B for May"
                  />
                </div>
                <div className="form-group">
                  <Req>Notify email</Req>
                  <input
                    type="email"
                    className="form-input"
                    value={form.notify_email}
                    onChange={(e) => setForm((f) => ({ ...f, notify_email: e.target.value }))}
                  />
                </div>
              </div>
              <div className="form-grid-3">
                <div className="form-group">
                  <Req>Date</Req>
                  <input
                    type="date"
                    className="form-input"
                    value={form.reminder_date}
                    onChange={(e) => setForm((f) => ({ ...f, reminder_date: dateOnly(e.target.value) }))}
                  />
                </div>
                <div className="form-group">
                  <Req>Time</Req>
                  <input
                    type="time"
                    className="form-input"
                    value={form.reminder_time}
                    onChange={(e) => setForm((f) => ({ ...f, reminder_time: e.target.value.slice(0, 5) }))}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Notes (optional)</label>
                <textarea
                  className="form-input"
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
              <div className="btn-row">
                <button type="button" className="btn-secondary" onClick={() => setFormOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className={`btn-primary ${saving ? 'btn-submitting' : ''}`} disabled={saving}>
                  {form.id ? 'Update' : 'Save'} & schedule email
                </button>
              </div>
            </form>
          )}

          <h4 className="form-section-title">Reminders ({reminders.length})</h4>
          <ReminderTable rows={reminders} onEdit={openEdit} onDelete={handleDelete} />

          <h4 className="form-section-title">Tasks ({tasks.length})</h4>
          <ReminderTable rows={tasks} onEdit={openEdit} onDelete={handleDelete} />
        </div>
      )}

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
                        {r.reminder_time} · {r.kind} · email: {r.email_status}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {dayStatutory.length === 0 && dayUser.length === 0 && (
              <p style={{ color: '#666' }}>No events on this date for current filters.</p>
            )}
            <button type="button" className="btn-primary" style={{ marginTop: 12 }} onClick={() => openCreate(dayModalDate)}>
              Add reminder on this date
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}

function ReminderTable({ rows, onEdit, onDelete }) {
  if (!rows.length) {
    return <p className="tax-calendar-empty">None yet.</p>;
  }
  return (
    <div className="premium-table-wrapper">
      <table className="premium-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Date</th>
            <th>Time</th>
            <th>Email</th>
            <th>Status</th>
            <th style={{ textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td style={{ fontWeight: 600 }}>{r.title}</td>
              <td>{formatDateDDMMYYYY(r.reminder_date)}</td>
              <td>{r.reminder_time}</td>
              <td style={{ fontSize: 11 }}>{r.notify_email}</td>
              <td>
                <span className={`tax-cal-status tax-cal-status--${r.email_status}`}>{r.email_status}</span>
              </td>
              <td style={{ textAlign: 'right' }}>
                <button type="button" className="btn-secondary" style={{ padding: '4px 8px', marginRight: 4 }} onClick={() => onEdit(r)}>
                  <Pencil size={12} />
                </button>
                <button type="button" className="btn-secondary" style={{ padding: '4px 8px', color: 'var(--accent-red)' }} onClick={() => onDelete(r)}>
                  <Trash2 size={12} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
