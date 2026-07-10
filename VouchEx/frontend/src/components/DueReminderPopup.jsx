import { useEffect, useRef, useState } from 'react';
import { Bell, CheckSquare } from 'lucide-react';
import { dateOnly } from '../utils/formatMoney';
import { isPopupAcknowledged, persistPopupAcknowledged } from '../utils/calendarPopupAck';
import { Modal } from './portalShared';

function isDue(reminder, now) {
  const d = dateOnly(reminder.reminder_date);
  const [hh, mm] = String(reminder.reminder_time || '09:00').split(':').map(Number);
  const due = new Date(`${d}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`);
  return due.getTime() <= now.getTime();
}

export function useDueReminderAlerts(calendarReminders, currentUser, markPopupShown, companyId) {
  const [queue, setQueue] = useState([]);
  const shownSessionRef = useRef(new Set());
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!currentUser || !calendarReminders?.length) return undefined;

    const check = () => {
      const now = new Date();
      const due = calendarReminders.filter((r) => {
        if (!isDue(r, now)) return false;
        if (isPopupAcknowledged(r, companyId)) return false;
        if (shownSessionRef.current.has(popupSessionKey(r))) return false;
        return true;
      });
      if (due.length) {
        setQueue((prev) => {
          const ids = new Set(prev.map((p) => popupSessionKey(p)));
          const merged = [...prev];
          due.forEach((d) => {
            const key = popupSessionKey(d);
            if (!ids.has(key)) merged.push(d);
          });
          return merged;
        });
      }
    };

    check();
    intervalRef.current = setInterval(check, 30000);
    return () => clearInterval(intervalRef.current);
  }, [calendarReminders, currentUser, companyId]);

  const dismissCurrent = async () => {
    const current = queue[0];
    if (!current) return;

    const sessionKey = popupSessionKey(current);
    shownSessionRef.current.add(sessionKey);
    persistPopupAcknowledged(current, companyId);

    setQueue((q) => q.slice(1));

    try {
      await markPopupShown(current.id);
    } catch {
      /* local + session ack already applied — do not re-queue */
    }
  };

  return { current: queue[0] || null, dismissCurrent, pendingCount: queue.length };
}

function popupSessionKey(reminder) {
  return `${reminder.id}:${reminder.reminder_date}:${reminder.reminder_time}`;
}

export default function DueReminderPopup({ item, onDismiss }) {
  if (!item) return null;

  const isTask = item.kind === 'task';

  return (
    <Modal open title={isTask ? 'Task due' : 'Reminder due'} onClose={onDismiss} width={480} variant="solid">
      <div className="due-reminder-popup">
        <div className={`due-reminder-popup__icon ${isTask ? 'due-reminder-popup__icon--task' : ''}`}>
          {isTask ? <CheckSquare size={28} /> : <Bell size={28} />}
        </div>
        <h3>{item.title}</h3>
        {item.priority && isTask && (
          <span className={`task-priority task-priority--${item.priority.toLowerCase()}`}>
            Priority {item.priority}
          </span>
        )}
        <p className="due-reminder-popup__when">
          Scheduled: {item.reminder_date} at {item.reminder_time}
        </p>
        {item.notes && <p className="due-reminder-popup__notes">{item.notes}</p>}
        {item.is_recurring && (
          <p className="due-reminder-popup__recurring">Recurring: {item.recurring_frequency || 'Yes'}</p>
        )}
        <button type="button" className="btn-primary" style={{ marginTop: 16 }} onClick={onDismiss}>
          Got it
        </button>
      </div>
    </Modal>
  );
}
