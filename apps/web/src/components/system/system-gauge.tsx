const R = 50;
const CIRCUMFERENCE = 2 * Math.PI * R;

/** Pick a font size so a centered, monospace label fits within `maxWidth`
 * (px in the 120-unit viewBox). Short strings keep `max`; long ones shrink to
 * `min` instead of spilling past the ring. ~0.6em per glyph for monospace. */
function fitFontSize(
  text: string,
  maxWidth: number,
  max: number,
  min: number,
  emPerChar = 0.6,
): number {
  const fit = maxWidth / Math.max(1, text.length * emPerChar);
  return Math.max(min, Math.min(max, Math.floor(fit)));
}

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
  // Shrink long labels so they stay inside the ring instead of clipping.
  const valueFontSize = fitFontSize(value, 98, 24, 11);
  const captionFontSize = fitFontSize(caption, 112, 10, 7, 0.56);
  return (
    <svg
      width={150}
      height={150}
      viewBox="0 0 120 120"
      className="my-3.5"
      role="img"
      aria-label={`${value} ${caption}`}
    >
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
        fontSize={valueFontSize}
      >
        {value}
      </text>
      <text
        x={60}
        y={74}
        textAnchor="middle"
        className="fill-muted-foreground font-mono"
        fontSize={captionFontSize}
      >
        {caption}
      </text>
    </svg>
  );
}
