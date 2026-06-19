import { Check } from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { SERIES_COLORS } from '@/data/aggregates';
import { formatBytes, formatCount } from '@/data/format';

// ---- tool-output shapes (mirror the backend agent tool returns) ------------

interface Pt {
  t: string;
  value: number | null;
}
interface SeriesOut {
  kind: 'series';
  title: string;
  unit: string;
  bucket: string;
  points: Pt[];
}
interface CompareOut {
  kind: 'compare';
  bucket: string;
  series: { label: string; unit: string; points: Pt[] }[];
}
interface StatOut {
  kind: 'stat';
  avg: number | null;
  min: number | null;
  max: number | null;
  count: number;
  unit: string;
  groupName: string;
}
interface ValuesOut {
  kind: 'values';
  items: {
    name: string;
    type: string;
    unit: string;
    value: number | null;
    at: string | null;
  }[];
}
interface AlertsOut {
  kind: 'alerts';
  alerting: { id: string; sensorId?: string; state?: string }[];
  recentEvents: unknown[];
}
interface StatsOut {
  kind: 'stats';
  approximateRowCount?: number;
  numChunks?: number;
  numDimensions?: number;
  compressionRatio?: number;
  totalBytes?: number;
}
interface DoneOut {
  kind: 'done';
  label: string;
}

export type ToolOutput =
  | SeriesOut
  | CompareOut
  | StatOut
  | ValuesOut
  | AlertsOut
  | StatsOut
  | DoneOut;

export const RENDERABLE_KINDS = new Set([
  'series',
  'compare',
  'stat',
  'values',
  'alerts',
  'stats',
  'done',
]);

// ---- helpers ---------------------------------------------------------------

const isDateBucket = (bucket: string) => /day|week|month|year/.test(bucket);

function fmtAxis(iso: string, bucket: string) {
  const d = new Date(iso);
  return isDateBucket(bucket)
    ? d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function fmtVal(n: number | null | undefined) {
  if (n == null) return '—';
  return Math.abs(n) >= 100 ? n.toFixed(0) : n.toFixed(1);
}

function Card({
  title,
  unit,
  children,
}: {
  title?: string;
  unit?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[12px] border border-border bg-card p-3">
      {title && (
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <span className="truncate text-xs font-semibold">{title}</span>
          {unit && <span className="text-[10px] text-muted-2">{unit}</span>}
        </div>
      )}
      {children}
    </div>
  );
}

interface TipPayload {
  name?: string;
  value?: number;
  color?: string;
}
function ChartTip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TipPayload[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-popover px-2 py-1 text-[11px] shadow-md">
      <div className="mb-0.5 text-muted-2">{label}</div>
      {payload.map((p, i) => (
        <div key={p.name ?? i} className="flex items-center gap-1.5">
          <span
            className="size-2 rounded-full"
            style={{ background: p.color }}
          />
          <span>{p.name}</span>
          <span className="ml-auto font-medium">{fmtVal(p.value ?? null)}</span>
        </div>
      ))}
    </div>
  );
}

const axisTick = { fontSize: 9.5, fill: 'var(--muted-2)' } as const;

// ---- per-kind views --------------------------------------------------------

function SeriesView({ o }: { o: SeriesOut }) {
  const data = o.points.map((p) => ({ label: fmtAxis(p.t, o.bucket), value: p.value }));
  return (
    <Card title={o.title} unit={o.unit}>
      <ResponsiveContainer width="100%" height={150}>
        <LineChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis dataKey="label" minTickGap={28} tick={axisTick} />
          <YAxis width={30} tick={axisTick} domain={['auto', 'auto']} />
          <Tooltip content={<ChartTip />} />
          <Line
            dataKey="value"
            type="monotone"
            stroke={SERIES_COLORS[0]}
            strokeWidth={1.8}
            dot={false}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}

function CompareView({ o }: { o: CompareOut }) {
  // Merge series onto a shared time axis, keyed by the formatted label.
  const labels = Array.from(
    new Set(o.series.flatMap((s) => s.points.map((p) => p.t))),
  ).sort();
  const rows = labels.map((t) => {
    const row: Record<string, number | string | null> = {
      label: fmtAxis(t, o.bucket),
    };
    o.series.forEach((s, i) => {
      row[`s${i}`] = s.points.find((p) => p.t === t)?.value ?? null;
    });
    return row;
  });
  return (
    <Card title="Comparison">
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={rows} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis dataKey="label" minTickGap={28} tick={axisTick} />
          <YAxis width={30} tick={axisTick} domain={['auto', 'auto']} />
          <Tooltip content={<ChartTip />} />
          {o.series.map((s, i) => (
            <Line
              key={s.label ?? i}
              name={s.label}
              dataKey={`s${i}`}
              type="monotone"
              stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
              strokeWidth={1.8}
              dot={false}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
        {o.series.map((s, i) => (
          <span key={s.label ?? i} className="flex items-center gap-1 text-[10.5px]">
            <span
              className="size-2 rounded-full"
              style={{ background: SERIES_COLORS[i % SERIES_COLORS.length] }}
            />
            {s.label}
          </span>
        ))}
      </div>
    </Card>
  );
}

function StatView({ o }: { o: StatOut }) {
  return (
    <Card>
      <div className="text-[11px] text-muted-2">{o.groupName}</div>
      <div className="text-2xl font-semibold leading-tight">
        {fmtVal(o.avg)} <span className="text-sm text-muted-2">{o.unit}</span>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-muted-foreground">
        <span>min {fmtVal(o.min)}</span>
        <span>max {fmtVal(o.max)}</span>
        <span>{o.count.toLocaleString()} readings</span>
      </div>
    </Card>
  );
}

function ValuesView({ o }: { o: ValuesOut }) {
  if (o.items.length === 0)
    return <Card>No matching sensors.</Card>;
  return (
    <div className="grid grid-cols-2 gap-2">
      {o.items.map((it) => (
        <div
          key={it.name}
          className="rounded-lg border border-border bg-card p-2"
        >
          <div className="truncate text-[10.5px] text-muted-2">{it.name}</div>
          <div className="text-base font-semibold">
            {fmtVal(it.value)}{' '}
            <span className="text-[11px] text-muted-2">{it.unit}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function AlertsView({ o }: { o: AlertsOut }) {
  if (o.alerting.length === 0)
    return <Card>No alerts are firing right now. ✅</Card>;
  return (
    <Card title="Active alerts">
      <ul className="space-y-1 text-[12px]">
        {o.alerting.map((a) => (
          <li key={a.id} className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-alert" />
            {a.sensorId ?? a.id}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function StatsView({ o }: { o: StatsOut }) {
  const rows = formatCount(o.approximateRowCount ?? 0);
  const size = formatBytes(o.totalBytes ?? 0);
  const stat = (label: string, value: string, unit?: string) => (
    <div>
      <div className="font-mono text-[10px] uppercase text-muted-2">{label}</div>
      <div className="text-lg font-semibold">
        {value}
        {unit && <span className="ml-0.5 text-xs text-muted-2">{unit}</span>}
      </div>
    </div>
  );
  return (
    <Card title="Readings storage">
      <div className="grid grid-cols-2 gap-2">
        {stat('Rows', rows.value, rows.unit)}
        {stat('Size', size.value, size.unit)}
        {stat('Chunks', String(o.numChunks ?? '—'))}
        {o.compressionRatio != null &&
          stat('Compression', `${(o.compressionRatio * 100).toFixed(0)}%`)}
      </div>
    </Card>
  );
}

function DoneView({ o }: { o: DoneOut }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[12px] text-foreground">
      <Check className="size-3.5 text-primary" />
      {o.label}
    </div>
  );
}

/** Render a tool's structured output as a chart/card. Returns null for outputs
 * without a renderable `kind`. */
export function ToolResultView({ output }: { output: ToolOutput }) {
  switch (output.kind) {
    case 'series':
      return <SeriesView o={output} />;
    case 'compare':
      return <CompareView o={output} />;
    case 'stat':
      return <StatView o={output} />;
    case 'values':
      return <ValuesView o={output} />;
    case 'alerts':
      return <AlertsView o={output} />;
    case 'stats':
      return <StatsView o={output} />;
    case 'done':
      return <DoneView o={output} />;
    default:
      return null;
  }
}
