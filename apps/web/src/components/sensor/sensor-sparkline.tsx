import type { SensorStatus } from '@/data/types';

const COLOR: Record<SensorStatus, string> = {
  OK: 'var(--primary)',
  ALERTING: 'var(--alert)',
  WARNING: 'var(--warn)',
  PAUSED: 'var(--muted-2)',
  NO_RULES: 'var(--muted-2)',
};

const W = 120;
const H = 34;

/** Lightweight inline-SVG sparkline (one per card; no axes). */
export function SensorSparkline({
  series,
  status,
}: {
  series: number[];
  status: SensorStatus;
}) {
  const color = COLOR[status];
  if (series.length < 2) {
    return <svg viewBox={`0 0 ${W} ${H}`} className="block h-9 w-full" aria-hidden="true" />;
  }
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;
  const points = series.map((value, i) => {
    const x = (i / (series.length - 1)) * W;
    const y = H - 2 - ((value - min) / span) * (H - 4);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const line = `M${points.join(' L')}`;
  const area = `${line} L${W},${H} L0,${H} Z`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="block h-9 w-full"
      aria-hidden="true"
    >
      <path d={area} fill={color} fillOpacity={0.1} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={1.6}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
