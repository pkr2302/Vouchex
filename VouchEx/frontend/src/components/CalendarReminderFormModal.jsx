import { useState, useEffect } from 'react';
import { Mail, Plus } from 'lucide-react';
import { useSimulator } from '../context/SimulatorContext';
import { dateOnly } from '../utils/formatMoney';
import { showApiError } from '../utils/apiErrors';
import { Req } from './portalShared';

const RECURRING_OPTIONS = [
  { value: 'daily', label: 'Every day' },
  { value: 'weekly', label: 'Every week' },
  { value: 'monthly', label: 'Every month' },
  { value: 'yearly', label: 'Every year' },
];

const emptyForm = (email, kind = 'reminder', dateStr) => ({
  id: null,
  kind,
  title: '',
  notes: '',
  reminder_date: dateStr || dateOnly(new Date().toISOString()),
  reminder_time: '09:00',
  notify_email: email || '',
  priority: 'B',
  is_recurring: false,
  recurring_frequency: 'monthly',
});

export default function CalendarReminderFormModal({
  open,
  onClose,
  initialKind = 'reminder',
  initialDate,
  editRow = null,
}) {
  const { createCalendarReminder, updateCalendarReminder, currentUser, companyDetails, addConsoleLog } = useSimulator();
  const [form, setForm] = useState(() => emptyForm(currentUser?.email || companyDetails?.email, initialKind, initialDate));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editRow) {
      setForm({
        id: editRow.id,
        kind: editRow.kind,
        title: editRow.title,
        notes: editRow.notes || '',
        reminder_date: dateOnly(editRow.reminder_date),
        reminder_time: editRow.reminder_time || '09:00',
        notify_email: editRow.notify_email,
        priority: editRow.priority || 'B',
        is_recurring: Boolean(editRow.is_recurring),
        recurring_frequency: editRow.recurring_frequency || 'monthly',
      });
    } else {
      setForm(emptyForm(currentUser?.email || companyDetails?.email, initialKind, initialDate));
    }
  }, [open, initialKind, initialDate, editRow, currentUser?.email, companyDetails?.email]);

  if (!open) return null;

  const isTask = form.kind === 'task';

  const handleSubmit = async (e) => {
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
      priority: isTask ? form.priority : null,
      is_recurring: !isTask && form.is_recurring,
      recurring_frequency: !isTask && form.is_recurring ? form.recurring_frequency : null,
    };
    try {
      if (form.id) {
        await updateCalendarReminder(form.id, payload);
        addConsoleLog('route', `PUT /api/tax-calendar/reminders/${form.id}`, 'Calendar entry updated.');
      } else {
        await createCalendarReminder(payload);
        addConsoleLog('route', 'POST /api/tax-calendar/reminders', `${isTask ? 'Task' : 'Reminder'} created.`);
      }
      onClose(true);
    } catch (err) {
      showApiError('Saving calendar entry', err);
    }
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={() => onClose(false)}>
      <div className="modal-content master-form dashboard-calendar-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="form-section-title">
          {form.id ? (isTask ? 'Edit Task' : 'Edit Reminder') : isTask ? 'Add Task' : 'Add Reminder'}
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          <Mail size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          {isTask
            ? 'Tasks are listed by priority on the dashboard. No email is sent for tasks.'
            : 'Email alerts are sent automatically at the scheduled time (server cron). Recurring reminders repeat until deleted.'}
        </p>
        <form onSubmit={handleSubmit}>
          <div className="form-grid-2">
            <div className="form-group">
              <Req>Title</Req>
              <input
                className="form-input"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder={isTask ? 'e.g. Reconcile bank statement' : 'e.g. File GSTR-3B for May'}
              />
            </div>
            {isTask && (
              <div className="form-group">
                <Req>Priority</Req>
                <select
                  className="form-input"
                  value={form.priority}
                  onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                >
                  <option value="A">A — Highest</option>
                  <option value="B">B — Normal</option>
                  <option value="C">C — Low</option>
                </select>
              </div>
            )}
            <div className="form-group">
              <Req>Date</Req>
              <input
                type="date"
                className="form-input"
                value={form.reminder_date}
                onChange={(e) => setForm((f) => ({ ...f, reminder_date: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <Req>Time</Req>
              <input
                type="time"
                className="form-input"
                value={form.reminder_time}
                onChange={(e) => setForm((f) => ({ ...f, reminder_time: e.target.value }))}
              />
            </div>
            {!isTask && (
              <>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="tax-export-option" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={form.is_recurring}
                      onChange={(e) => setForm((f) => ({ ...f, is_recurring: e.target.checked }))}
                    />
                    <span>Recurring reminder</span>
                  </label>
                </div>
                {form.is_recurring && (
                  <div className="form-group">
                    <Req>Repeat</Req>
                    <select
                      className="form-input"
                      value={form.recurring_frequency}
                      onChange={(e) => setForm((f) => ({ ...f, recurring_frequency: e.target.value }))}
                    >
                      {RECURRING_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            )}
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <Req>Notify email</Req>
              <input
                type="email"
                className="form-input"
                value={form.notify_email}
                onChange={(e) => setForm((f) => ({ ...f, notify_email: e.target.value }))}
              />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Notes (optional)</label>
              <textarea
                className="form-input"
                rows={2}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <div className="btn-row" style={{ marginTop: '16px' }}>
            <button type="button" className="btn-secondary" onClick={() => onClose(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              <Plus size={14} />
              {saving ? 'Saving…' : form.id ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
