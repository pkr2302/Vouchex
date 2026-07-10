import { useEffect, useState } from 'react';

export default function HeaderClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const dateStr = now.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  return (
    <div className="header-clock" aria-live="polite">
      <span className="header-clock__date">{dateStr}</span>
      <span className="header-clock__sep">·</span>
      <span className="header-clock__time">{timeStr}</span>
    </div>
  );
}
