const R = 50;
const CIRCUMFERENCE = 2 * Math.PI * R;

/** Radial progress gauge (SVG arc) — used for compression ratio & chunk coverage. */
export function SystemGauge({
  percent,
  value,
  caption,
  color,
}: {
  percent: number;
  value: string;
  caption: string;
  color: string;
}) {
  const dash = Math.max(0, Math.min(1, percent)) * CIRCUMFERENCE;
  return (
    <svg width={150} height={150} viewBox="0 0 120 120" className="my-3.5">
      <circle
        cx={60}
        cy={60}
        r={R}
        fill="none"
        stroke="var(--surface-2)"
        strokeWidth={13}
      />
      <circle
        cx={60}
        cy={60}
        r={R}
        fill="none"
        stroke={color}
        strokeWidth={13}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${CIRCUMFERENCE}`}
        transform="rotate(-90 60 60)"
      />
      <text
        x={60}
        y={55}
        textAnchor="middle"
        className="fill-foreground font-mono"
        fontWeight={600}
        fontSize={24}
      >
        {value}
      </text>
      <text
        x={60}
        y={74}
        textAnchor="middle"
        className="fill-muted-foreground font-mono"
        fontSize={10}
      >
        {caption}
      </text>
    </svg>
  );
}
