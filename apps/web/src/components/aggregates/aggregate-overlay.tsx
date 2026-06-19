import { useQuery } from '@apollo/client/react';
import { Plus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  BUCKET_INTERVAL,
  estimatePoints,
  formatBucketLabel,
  MAX_POINTS,
  type RangeKey,
  type Resolution,
  RESOLUTION_LABEL,
} from '@/components/sensor-detail/chart-params';
import {
  datesToWindow,
  resolveWindow,
  shiftWindow,
  type TimeWindow,
} from '@/components/sensor-detail/chart-window';
import { DetailChartControls } from '@/components/sensor-detail/detail-chart-controls';
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
  dimStroke,
  useSeriesToggle,
} from '@/components/charts/use-series-toggle';
import { SERIES_COLORS } from '@/data/aggregates';
import {
  DEFAULT_RANGE,
  DEFAULT_RES,
} from '@/components/sensor-detail/chart-params';
import {
  GroupSeriesDocument,
  SensorGroupsDocument,
  SensorTypesDocument,
} from '@/graphql/sensors.generated';
import { useSearchState } from '@/lib/use-search-state';
import { type OverlaySeries, SERIES_AGGS } from './aggregate-chart-params';

const ALL = '__all__';
const round1 = (n: number | null | undefined) =>
  n == null ? '—' : Math.round(n * 10) / 10;

interface SeriesMeta {
  key: string;
  label: string;
  unit: string;
  color: string;
}
type Row = { bucket: string; real: Record<string, number | null> } & Record<
  string,
  number | string | Record<string, number | null>
>;

function OverlayTooltip({
  active,
  payload,
  series,
  res,
}: {
  active?: boolean;
  payload?: { dataKey: string; payload: Row }[];
  series: SeriesMeta[];
  res: Resolution;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-md border border-border bg-card px-2.5 py-2 text-[11px] shadow-md">
      <div className="mb-1 font-mono font-semibold">
        {formatBucketLabel(row.bucket, res)}
      </div>
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
                {round1(row.real[p.dataKey])} {meta.unit}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

export function AggregateOverlay() {
  const [{ res, range, from, to, series }, setSearch] =
    useSearchState('/aggregates');
  // Reset visibility when series are added/removed (keys are positional).
  const toggle = useSeriesToggle(series.length);
  const { data: groupsData } = useQuery(SensorGroupsDocument, {
    context: { suppressErrorToast: true },
  });
  const groups = groupsData?.sensorGroups ?? [];
  const groupById = new Map(groups.map((g) => [g.id, g]));

  const { data: typesData } = useQuery(SensorTypesDocument, {
    context: { suppressErrorToast: true },
  });
  const types = typesData?.sensorTypes ?? [];
  const typeByKey = new Map(types.map((t) => [t.key, t]));

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);

  const { window, live } = resolveWindow({ res, range, from, to, now });
  const pointCount = estimatePoints(res, window.endMs - window.startMs);
  const tooMany = pointCount > MAX_POINTS;

  const specs = series.map((s) => ({
    groupId: s.g,
    type: s.t ?? null,
    agg: s.agg,
  }));
  const ready = series.length > 0 && series.every((s) => s.g);

  const { data, loading, error } = useQuery(GroupSeriesDocument, {
    variables: {
      specs,
      bucket: BUCKET_INTERVAL[res],
      start: new Date(window.startMs).toISOString(),
      end: new Date(window.endMs).toISOString(),
    },
    skip: !ready || tooMany,
    pollInterval: live ? 15_000 : undefined,
    context: { suppressErrorToast: true },
  });

  // Build normalized rows (mixed units) + keep real values for the tooltip.
  const result = data?.groupSeries ?? [];
  const meta: SeriesMeta[] = series.map((s, i) => {
    const typeLabel = s.t ? (typeByKey.get(s.t)?.label ?? s.t) : 'All';
    return {
      key: `s${i}`,
      label: `${groupById.get(s.g)?.name ?? 'Group'} · ${typeLabel} · ${s.agg.toLowerCase()}`,
      unit: s.t ? (typeByKey.get(s.t)?.unit ?? '') : '',
      color: SERIES_COLORS[i % SERIES_COLORS.length],
    };
  });
  const norm = result.map((r) => {
    const vals = r.points.flatMap((p) => (p.value == null ? [] : [p.value]));
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const span = max - min || 1;
    const n = new Map<string, number | null>();
    const real = new Map<string, number | null>();
    for (const p of r.points) {
      n.set(p.bucket, p.value == null ? null : Math.round(((p.value - min) / span) * 100) / 100);
      real.set(p.bucket, p.value ?? null);
    }
    return { n, real };
  });
  const allBuckets = [
    ...new Set(result.flatMap((r) => r.points.map((p) => p.bucket))),
  ].sort();
  const rows: Row[] = allBuckets.map((bucket) => {
    const row: Row = { bucket, real: {} };
    norm.forEach((s, i) => {
      const v = s.n.get(bucket);
      if (v != null) {
        row[`s${i}`] = v;
        row.real[`s${i}`] = s.real.get(bucket) ?? null;
      }
    });
    return row;
  });

  // ---- editor + window helpers ----
  const setWindow = (w: TimeWindow) =>
    setSearch({
      from: new Date(w.startMs).toISOString(),
      to: new Date(w.endMs).toISOString(),
    });
  const goLive = () => setSearch({ from: undefined, to: undefined });
  const isDefault = live && res === DEFAULT_RES && range === DEFAULT_RANGE;

  const addSeries = () =>
    setSearch({
      series: [...series, { g: groups[0]?.id ?? '', agg: 'AVG' as const }],
    });
  const updateSeries = (i: number, patch: Partial<OverlaySeries>) =>
    setSearch({
      series: series.map((s, j) => (j === i ? { ...s, ...patch } : s)),
    });
  const removeSeries = (i: number) =>
    setSearch({ series: series.filter((_, j) => j !== i) });

  return (
    <div className="rounded-[14px] border border-border bg-card p-5 shadow-sm">
      <div className="mb-3">
        <h3 className="text-sm font-semibold">Group overlay</h3>
        <div className="mt-0.5 text-xs text-muted-foreground">
          Overlay aggregate series across groups ·{' '}
          {RESOLUTION_LABEL[res].toLowerCase()} buckets · each normalized
        </div>
      </div>

      <DetailChartControls
        res={res}
        range={range}
        live={live}
        window={window}
        onResChange={(r) => setSearch({ res: r })}
        onRangeChange={(r: RangeKey) =>
          setSearch({ range: r, from: undefined, to: undefined })
        }
        onShift={(dir) => {
          const next = shiftWindow(window, dir);
          if (dir === 1 && next.endMs >= Date.now()) goLive();
          else setWindow(next);
        }}
        onLive={goLive}
        onApplyDates={(s, e) => {
          const w = datesToWindow(s, e);
          if (w) setWindow(w);
        }}
        onReset={() =>
          setSearch({
            res: DEFAULT_RES,
            range: DEFAULT_RANGE,
            from: undefined,
            to: undefined,
          })
        }
        canReset={!isDefault}
      />

      {/* Series editor */}
      <div className="mt-3 flex flex-col gap-2">
        {series.map((s, i) => (
          <div
            key={`${s.g}|${s.t ?? 'all'}|${s.agg}|${i}`}
            className="flex flex-wrap items-center gap-2"
            onMouseEnter={() => toggle.setHovered(meta[i].key)}
            onMouseLeave={() => toggle.setHovered(null)}
          >
            <button
              type="button"
              aria-pressed={!toggle.hidden.has(meta[i].key)}
              aria-label={
                toggle.hidden.has(meta[i].key) ? 'Show series' : 'Hide series'
              }
              onClick={() => toggle.toggle(meta[i].key)}
              className="size-2.5 flex-none rounded-full outline-none ring-offset-1 transition-opacity focus-visible:ring-2 focus-visible:ring-ring"
              style={{
                background: meta[i].color,
                opacity: toggle.hidden.has(meta[i].key) ? 0.3 : 1,
              }}
            />
            <Select value={s.g} onValueChange={(v) => updateSeries(i, { g: v })}>
              <SelectTrigger size="sm" className="w-[150px]">
                <SelectValue placeholder="Group" />
              </SelectTrigger>
              <SelectContent>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={s.t ?? ALL}
              onValueChange={(v) =>
                updateSeries(i, {
                  t: v === ALL ? undefined : (v as OverlaySeries['t']),
                })
              }
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
              value={s.agg}
              onValueChange={(v) =>
                updateSeries(i, { agg: v as OverlaySeries['agg'] })
              }
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
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Remove series"
              onClick={() => removeSeries(i)}
            >
              <X className="size-4" />
            </Button>
          </div>
        ))}
        <div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={groups.length === 0}
            onClick={addSeries}
          >
            <Plus className="size-3.5" />
            Add series
          </Button>
          {groups.length === 0 && (
            <span className="ml-2 text-[11.5px] text-muted-2">
              Create groups under Manage first.
            </span>
          )}
        </div>
      </div>

      <div className="mt-3">
        {tooMany ? (
          <div className="flex h-[240px] items-center justify-center text-center text-[12.5px] text-muted-foreground">
            That’s ~{pointCount.toLocaleString()} buckets — pick a coarser
            resolution or shorter range.
          </div>
        ) : error ? (
          <div className="flex h-[240px] items-center justify-center text-center text-[12.5px] text-alert">
            Couldn’t load series: {error.message}
          </div>
        ) : !ready ? (
          <div className="flex h-[240px] items-center justify-center text-center text-[12.5px] text-muted-foreground">
            Add a series to compare group aggregates (e.g. avg temp of Upper
            floor vs Lower floor).
          </div>
        ) : loading && rows.length === 0 ? (
          <Skeleton className="h-[240px] w-full rounded-md" />
        ) : rows.length === 0 ? (
          <div className="flex h-[240px] items-center justify-center text-center text-[12.5px] text-muted-foreground">
            No readings for these series in this window.
          </div>
        ) : (
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={rows}
                margin={{ left: 4, right: 8, top: 8, bottom: 0 }}
              >
                <CartesianGrid vertical={false} stroke="var(--grid)" />
                <XAxis
                  dataKey="bucket"
                  tickFormatter={(b: string) => formatBucketLabel(b, res)}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={40}
                  tick={{ fontSize: 10.5, fill: 'var(--muted-2)' }}
                />
                <YAxis
                  width={36}
                  domain={[0, 1]}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10.5, fill: 'var(--muted-2)' }}
                />
                <Tooltip
                  cursor={{ stroke: 'var(--border)' }}
                  content={({ active, payload }) => (
                    <OverlayTooltip
                      active={active}
                      payload={
                        payload as unknown as {
                          dataKey: string;
                          payload: Row;
                        }[]
                      }
                      series={meta}
                      res={res}
                    />
                  )}
                />
                {meta.map((m) => {
                  const st = toggle.seriesProps(m.key);
                  return (
                    <Line
                      key={m.key}
                      dataKey={m.key}
                      type="monotone"
                      stroke={m.color}
                      strokeOpacity={dimStroke(st.dim)}
                      hide={st.hide}
                      strokeWidth={1.8}
                      dot={false}
                      isAnimationActive={false}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
