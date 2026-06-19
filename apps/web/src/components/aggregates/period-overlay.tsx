import { useQuery } from '@apollo/client/react';
import { Plus, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { InteractiveLegend } from '@/components/charts/interactive-legend';
import {
  buildRangeRows,
  type DateRange,
  MAX_PERIODS,
  PERIOD_UNIT_LABEL,
  PERIOD_UNIT_MS,
  type PeriodRow,
  type PeriodSeriesMeta,
  type PeriodUnit,
  rangeSeriesMeta,
  rangesQuery,
  rollingRanges,
} from '@/components/charts/period-series';
import {
  dimStroke,
  type SeriesToggle,
  useSeriesToggle,
} from '@/components/charts/use-series-toggle';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  GroupSeriesDocument,
  SensorGroupsDocument,
  SensorTypesDocument,
} from '@/graphql/sensors.generated';
import { SERIES_AGGS } from './aggregate-chart-params';

const MAX_AMOUNT = 999;
const POLL_MS = 30_000;
const ALL = '__all__';
const round1 = (n: number | null | undefined) =>
  n == null ? '—' : Math.round(n * 10) / 10;

// "Rolling" = previous-period offset (the Grafana way); "Custom" = pick the
// exact ranges to compare (the Google "compare date ranges" way).
const MODES = [
  { value: 'rolling', label: 'Rolling (previous periods)' },
  { value: 'custom', label: 'Custom ranges' },
] as const;
type Mode = (typeof MODES)[number]['value'];

const toIsoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const fmtShort = (ms: number) =>
  new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

interface CustomRange {
  id: string;
  start: string; // YYYY-MM-DD
  end: string;
}
const newRange = (start: string, end: string): CustomRange => ({
  id: crypto.randomUUID(),
  start,
  end,
});

function PeriodTooltip({
  active,
  payload,
  label,
  series,
  unit,
}: {
  active?: boolean;
  payload?: { dataKey: string; value: number | null }[];
  label?: number;
  series: PeriodSeriesMeta[];
  unit: string;
}) {
  if (!active || !payload?.length) return null;
  const within =
    label != null
      ? new Date(label).toLocaleString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '';
  return (
    <div className="rounded-md border border-border bg-card px-2.5 py-2 text-[11px] shadow-md">
      <div className="mb-1 font-mono font-semibold">{within}</div>
      <div className="grid grid-cols-[auto_auto] gap-x-3 gap-y-0.5">
        {payload.map((p) => {
          const meta = series.find((s) => s.key === p.dataKey);
          if (!meta) return null;
          return (
            <span key={p.dataKey} className="contents">
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="size-2 rounded-full"
                  style={{ background: meta.color }}
                />
                {meta.label}
              </span>
              <span className="text-right font-mono font-semibold">
                {round1(p.value)} {unit}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

function DateInput({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <input
      type="date"
      value={value}
      aria-label={label}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 rounded-md border border-border bg-card px-2 text-[12.5px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
    />
  );
}

function PeriodChart({
  rows,
  series,
  unit,
  fmtTick,
  toggle,
}: {
  rows: PeriodRow[];
  series: PeriodSeriesMeta[];
  unit: string;
  fmtTick: (t: number) => string;
  toggle: SeriesToggle;
}) {
  return (
    <>
      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            <XAxis
              dataKey="t"
              tickFormatter={fmtTick}
              tickLine={false}
              axisLine={false}
              minTickGap={40}
              tick={{ fontSize: 10.5, fill: 'var(--muted-2)' }}
            />
            <YAxis
              width={40}
              domain={['auto', 'auto']}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10.5, fill: 'var(--muted-2)' }}
            />
            <Tooltip
              cursor={{ stroke: 'var(--border)' }}
              content={({ active, payload, label }) => (
                <PeriodTooltip
                  active={active}
                  payload={
                    payload as unknown as {
                      dataKey: string;
                      value: number | null;
                    }[]
                  }
                  label={label as number}
                  series={series}
                  unit={unit}
                />
              )}
            />
            {series.map((s) => {
              const st = toggle.seriesProps(s.key);
              return (
                <Line
                  key={s.key}
                  dataKey={s.key}
                  type="monotone"
                  stroke={s.color}
                  strokeOpacity={dimStroke(st.dim)}
                  hide={st.hide}
                  strokeWidth={1.8}
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <InteractiveLegend
        className="mt-2"
        items={series}
        hidden={toggle.hidden}
        toggle={toggle.toggle}
        setHovered={toggle.setHovered}
      />
    </>
  );
}

/** Overlay one metric across a set of date ranges, each re-based onto the first
 * range's timeline so they line up. Ranges come from a "rolling" previous-period
 * offset or hand-picked "custom" ranges — both feed the same engine. */
export function PeriodOverlay() {
  const { data: groupsData } = useQuery(SensorGroupsDocument, {
    context: { suppressErrorToast: true },
  });
  const groups = groupsData?.sensorGroups ?? [];
  const { data: typesData } = useQuery(SensorTypesDocument, {
    context: { suppressErrorToast: true },
  });
  const types = typesData?.sensorTypes ?? [];
  const typeByKey = new Map(types.map((t) => [t.key, t]));

  const [group, setGroup] = useState<string | undefined>(undefined);
  const [type, setType] = useState<string | undefined>(undefined);
  const [agg, setAgg] = useState<(typeof SERIES_AGGS)[number]>('AVG');
  const [mode, setMode] = useState<Mode>('rolling');

  // Rolling controls.
  const [amount, setAmount] = useState(1);
  const [unit, setUnit] = useState<PeriodUnit>('week');
  const [count, setCount] = useState(4);

  // Custom controls — seed with the last two weeks.
  const [custom, setCustom] = useState<CustomRange[]>(() => {
    const day = PERIOD_UNIT_MS.day;
    const now = Date.now();
    return [
      newRange(toIsoDay(now - 7 * day), toIsoDay(now)),
      newRange(toIsoDay(now - 14 * day), toIsoDay(now - 7 * day)),
    ];
  });

  // Advance the rolling window over time so the latest period stays live.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), POLL_MS);
    return () => clearInterval(id);
  }, []);

  const g = group ?? groups[0]?.id;

  const ranges = useMemo<DateRange[]>(() => {
    if (mode === 'custom') {
      return custom
        .map((r) => {
          const s = Date.parse(`${r.start}T00:00:00Z`);
          const e = Date.parse(`${r.end}T00:00:00Z`);
          if (!Number.isFinite(s) || !Number.isFinite(e) || e < s) return null;
          // +1 day so the end date is inclusive.
          return {
            start: s,
            end: e + PERIOD_UNIT_MS.day,
            label: `${fmtShort(s)} – ${fmtShort(e)}`,
          };
        })
        .filter((x): x is DateRange => x != null)
        .sort((a, b) => b.start - a.start);
    }
    return rollingRanges(amount, unit, count, now);
  }, [mode, custom, amount, unit, count, now]);

  const ready = Boolean(g) && ranges.length >= 2;
  const { start, end, bucket } = useMemo(
    () =>
      ranges.length
        ? rangesQuery(ranges)
        : { start: '', end: '', bucket: '1 hour' },
    [ranges],
  );

  const { data, loading, error } = useQuery(GroupSeriesDocument, {
    variables: {
      specs: [{ groupId: g ?? '', type: type ?? null, agg }],
      bucket,
      start,
      end,
    },
    skip: !ready,
    pollInterval: mode === 'rolling' ? POLL_MS : undefined,
    context: { suppressErrorToast: true },
  });

  const series = useMemo(() => rangeSeriesMeta(ranges), [ranges]);
  const rows = useMemo(
    () => buildRangeRows(data?.groupSeries?.[0]?.points ?? [], ranges),
    [data, ranges],
  );
  const unitStr = type ? (typeByKey.get(type)?.unit ?? '') : '';
  const toggle = useSeriesToggle(ranges.length);

  // Format ticks by the first range's length: hours intraday, weekday for ~a
  // week, dates for longer.
  const baseSpan = ranges[0] ? ranges[0].end - ranges[0].start : PERIOD_UNIT_MS.day;
  const fmtTick = (t: number) => {
    const d = new Date(t);
    if (baseSpan <= 1.5 * PERIOD_UNIT_MS.day)
      return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    if (baseSpan <= 9 * PERIOD_UNIT_MS.day)
      return d.toLocaleDateString(undefined, { weekday: 'short' });
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const updateCustom = (i: number, patch: Partial<CustomRange>) =>
    setCustom((c) => c.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <div className="rounded-[14px] border border-border bg-card p-5 shadow-sm">
      <div className="mb-3">
        <h3 className="text-sm font-semibold">Period comparison</h3>
        <div className="mt-0.5 text-xs text-muted-foreground">
          Overlay one metric across several time ranges, aligned so they line up.
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Select value={g} onValueChange={setGroup}>
          <SelectTrigger size="sm" className="w-[150px]">
            <SelectValue placeholder="Group" />
          </SelectTrigger>
          <SelectContent>
            {groups.map((x) => (
              <SelectItem key={x.id} value={x.id}>
                {x.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={type ?? ALL}
          onValueChange={(v) => setType(v === ALL ? undefined : v)}
        >
          <SelectTrigger size="sm" className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All types</SelectItem>
            {types.map((t) => (
              <SelectItem key={t.key} value={t.key}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={agg}
          onValueChange={(v) => setAgg(v as (typeof SERIES_AGGS)[number])}
        >
          <SelectTrigger size="sm" className="w-[90px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SERIES_AGGS.map((a) => (
              <SelectItem key={a} value={a}>
                {a.charAt(0) + a.slice(1).toLowerCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={mode} onValueChange={(v) => setMode(v as Mode)}>
          <SelectTrigger size="sm" className="ml-2 w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MODES.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {mode === 'rolling' ? (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-[12px] text-muted-2">period</span>
          <input
            type="number"
            min={1}
            value={amount}
            onChange={(e) => {
              const n = Math.floor(Number(e.target.value));
              setAmount(
                Number.isFinite(n) ? Math.min(MAX_AMOUNT, Math.max(1, n)) : 1,
              );
            }}
            aria-label="Period length"
            className="h-8 w-[3.5rem] rounded-md border border-border bg-card px-2 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Select value={unit} onValueChange={(v) => setUnit(v as PeriodUnit)}>
            <SelectTrigger size="sm" className="w-[90px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(PERIOD_UNIT_MS) as PeriodUnit[]).map((u) => (
                <SelectItem key={u} value={u}>
                  {PERIOD_UNIT_LABEL[u]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-[12px] text-muted-2">×</span>
          <input
            type="number"
            min={2}
            max={MAX_PERIODS}
            value={count}
            onChange={(e) =>
              setCount(
                Math.min(MAX_PERIODS, Math.max(2, Number(e.target.value) || 2)),
              )
            }
            aria-label="Number of periods"
            className="h-8 w-[3.5rem] rounded-md border border-border bg-card px-2 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      ) : (
        <div className="mb-3 flex flex-col gap-2">
          {custom.map((r, i) => (
            <div key={r.id} className="flex items-center gap-2">
              <DateInput
                value={r.start}
                label="Range start"
                onChange={(v) => updateCustom(i, { start: v })}
              />
              <span className="text-[12px] text-muted-2">→</span>
              <DateInput
                value={r.end}
                label="Range end"
                onChange={(v) => updateCustom(i, { end: v })}
              />
              {custom.length > 2 && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Remove range"
                  onClick={() =>
                    setCustom((c) => c.filter((_, j) => j !== i))
                  }
                >
                  <X className="size-4" />
                </Button>
              )}
            </div>
          ))}
          {custom.length < MAX_PERIODS && (
            <div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  const last = custom[custom.length - 1];
                  setCustom((c) => [...c, newRange(last.start, last.end)]);
                }}
              >
                <Plus className="size-3.5" />
                Add range
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="mt-3">
        {!ready ? (
          <div className="flex h-[260px] items-center justify-center text-center text-[12.5px] text-muted-foreground">
            Pick a group and at least 2 ranges to compare.
          </div>
        ) : error ? (
          <div className="flex h-[260px] items-center justify-center text-center text-[12.5px] text-alert">
            Couldn’t load series: {error.message}
          </div>
        ) : loading && rows.length === 0 ? (
          <Skeleton className="h-[260px] w-full rounded-md" />
        ) : rows.length === 0 ? (
          <div className="flex h-[260px] items-center justify-center text-center text-[12.5px] text-muted-foreground">
            No readings in these ranges.
          </div>
        ) : (
          <PeriodChart
            rows={rows}
            series={series}
            unit={unitStr}
            fmtTick={fmtTick}
            toggle={toggle}
          />
        )}
      </div>
    </div>
  );
}
