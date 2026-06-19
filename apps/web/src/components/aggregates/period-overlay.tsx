import { useQuery } from '@apollo/client/react';
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
  buildPeriodRows,
  MAX_PERIODS,
  periodMsOf,
  periodSeriesMeta,
  periodWindow,
  PERIOD_UNIT_LABEL,
  PERIOD_UNIT_MS,
  type PeriodUnit,
} from '@/components/charts/period-series';
import {
  dimStroke,
  useSeriesToggle,
} from '@/components/charts/use-series-toggle';
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

interface SeriesMeta {
  key: string;
  label: string;
  color: string;
}
type Row = { t: number } & Record<string, number | null>;

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
  series: SeriesMeta[];
  unit: string;
}) {
  if (!active || !payload?.length) return null;
  const within =
    label != null
      ? new Date(label).toLocaleString(undefined, {
          weekday: 'short',
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

/** Overlay the same metric across consecutive equal-length periods (e.g. the
 * last 6 weeks), each re-based onto the current period's timeline so they line
 * up for comparison. One query over the whole span, split client-side. */
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
  const [amount, setAmount] = useState(1);
  const [unit, setUnit] = useState<PeriodUnit>('week');
  const [count, setCount] = useState(4);

  // Advance the window over time so the latest (partial) period stays live.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), POLL_MS);
    return () => clearInterval(id);
  }, []);

  const g = group ?? groups[0]?.id;
  const periodMs = periodMsOf(amount, unit);
  const ready = Boolean(g) && periodMs > 0 && count >= 2;

  // One query covers all `count` periods back from now (bucket-snapped window).
  const { start, end, bucket, nowAnchor } = useMemo(
    () => periodWindow(periodMs, count, now),
    [periodMs, count, now],
  );

  const { data, loading, error } = useQuery(GroupSeriesDocument, {
    variables: {
      specs: [{ groupId: g ?? '', type: type ?? null, agg }],
      bucket,
      start,
      end,
    },
    skip: !ready,
    pollInterval: POLL_MS,
    context: { suppressErrorToast: true },
  });

  const series: SeriesMeta[] = useMemo(
    () => periodSeriesMeta(count, amount, unit),
    [count, amount, unit],
  );

  const rows = useMemo<Row[]>(
    () =>
      buildPeriodRows(
        data?.groupSeries?.[0]?.points ?? [],
        periodMs,
        count,
        nowAnchor,
      ),
    [data, periodMs, count, nowAnchor],
  );
  const unitStr = type ? (typeByKey.get(type)?.unit ?? '') : '';

  const toggle = useSeriesToggle(count);

  const fmtTick = (t: number) =>
    new Date(t).toLocaleDateString(undefined, {
      weekday: unit === 'week' ? 'short' : undefined,
      month: unit === 'week' ? undefined : 'short',
      day: unit === 'week' ? undefined : 'numeric',
      hour: unit === 'day' ? '2-digit' : undefined,
    });

  return (
    <div className="rounded-[14px] border border-border bg-card p-5 shadow-sm">
      <div className="mb-3">
        <h3 className="text-sm font-semibold">Period comparison</h3>
        <div className="mt-0.5 text-xs text-muted-foreground">
          Overlay the same metric across the last {count * amount}{' '}
          {PERIOD_UNIT_LABEL[unit].toLowerCase()}, aligned so periods line up.
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

        <span className="ml-2 text-[12px] text-muted-2">period</span>
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

      <div className="mt-3">
        {!ready ? (
          <div className="flex h-[260px] items-center justify-center text-center text-[12.5px] text-muted-foreground">
            Pick a group and at least 2 periods to compare.
          </div>
        ) : error ? (
          <div className="flex h-[260px] items-center justify-center text-center text-[12.5px] text-alert">
            Couldn’t load series: {error.message}
          </div>
        ) : loading && rows.length === 0 ? (
          <Skeleton className="h-[260px] w-full rounded-md" />
        ) : rows.length === 0 ? (
          <div className="flex h-[260px] items-center justify-center text-center text-[12.5px] text-muted-foreground">
            No readings for these periods yet.
          </div>
        ) : (
          <>
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={rows}
                  margin={{ left: 4, right: 8, top: 8, bottom: 0 }}
                >
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
                        unit={unitStr}
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
        )}
      </div>
    </div>
  );
}
