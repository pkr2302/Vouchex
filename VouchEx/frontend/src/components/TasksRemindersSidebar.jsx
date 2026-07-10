import { Pencil, Trash2, Mail } from 'lucide-react';
import { formatDateDDMMYYYY } from '../utils/formatMoney';

const PRIORITY_ORDER = { A: 0, B: 1, C: 2 };

function sortTasks(rows) {
  return [...rows].sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority] ?? 1;
    const pb = PRIORITY_ORDER[b.priority] ?? 1;
    if (pa !== pb) return pa - pb;
    return String(a.reminder_date).localeCompare(String(b.reminder_date));
  });
}

function sortReminders(rows) {
  return [...rows].sort((a, b) => {
    const d = String(a.reminder_date).localeCompare(String(b.reminder_date));
    if (d !== 0) return d;
    return String(a.reminder_time).localeCompare(String(b.reminder_time));
  });
}

function SideList({ title, rows, emptyText, onEdit, onDelete, showPriority }) {
  return (
    <div className="tasks-reminders-panel__section">
      <h4 className="tasks-reminders-panel__heading">{title}</h4>
      {!rows.length ? (
        <p className="tasks-reminders-panel__empty">{emptyText}</p>
      ) : (
        <ul className="tasks-reminders-panel__list">
          {rows.map((r) => (
            <li key={r.id} className="tasks-reminders-panel__item">
              <div className="tasks-reminders-panel__item-main">
                {showPriority && r.priority && (
                  <span className={`task-priority task-priority--${r.priority.toLowerCase()}`}>{r.priority}</span>
                )}
                <strong className="tasks-reminders-panel__title">{r.title}</strong>
                <span className="tasks-reminders-panel__meta">
                  {formatDateDDMMYYYY(r.reminder_date)} · {r.reminder_time}
                  {r.is_recurring && r.recurring_frequency ? ` · ↻ ${r.recurring_frequency}` : ''}
                </span>
                {r.notes && <span className="tasks-reminders-panel__notes">{r.notes}</span>}
              </div>
              <div className="tasks-reminders-panel__actions">
                {r.kind === 'reminder' && (
                  <span className={`tax-cal-status tax-cal-status--${r.email_status}`} title="Email status">
                    <Mail size={11} />
                  </span>
                )}
                <button type="button" className="btn-icon-sm" onClick={() => onEdit(r)} title="Edit">
                  <Pencil size={12} />
                </button>
                <button type="button" className="btn-icon-sm btn-icon-sm--danger" onClick={() => onDelete(r)} title="Delete">
                  <Trash2 size={12} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function TasksRemindersSidebar({ calendarReminders = [], onEdit, onDelete }) {
  const tasks = sortTasks(calendarReminders.filter((r) => r.kind === 'task'));
  const reminders = sortReminders(calendarReminders.filter((r) => r.kind === 'reminder'));

  return (
    <aside className="tasks-reminders-panel">
      <SideList
        title={`Tasks (${tasks.length})`}
        rows={tasks}
        emptyText="No tasks yet. Use Add Task on the calendar."
        onEdit={onEdit}
        onDelete={onDelete}
        showPriority
      />
      <SideList
        title={`Reminders (${reminders.length})`}
        rows={reminders}
        emptyText="No reminders yet. Use Add Reminder on the calendar."
        onEdit={onEdit}
        onDelete={onDelete}
        showPriority={false}
      />
    </aside>
  );
}
