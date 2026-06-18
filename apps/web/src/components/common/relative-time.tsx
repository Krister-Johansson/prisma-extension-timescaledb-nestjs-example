import { useEffect, useState } from 'react';

function formatAgo(deltaMs: number): string {
  const s = Math.max(0, Math.floor(deltaMs / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/** "Xs ago / Xm ago …" that re-renders every second so it counts up live. */
export function RelativeTime({ iso }: { iso: string }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const date = new Date(iso);
  return (
    <span title={date.toLocaleString()}>
      {formatAgo(Date.now() - date.getTime())}
    </span>
  );
}
