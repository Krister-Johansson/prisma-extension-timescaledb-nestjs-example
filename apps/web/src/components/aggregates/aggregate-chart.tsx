import { useQuery } from '@apollo/client/react';
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
import { InteractiveLegend } from '@/components/charts/interactive-legend';
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
  buildGroupTree,
  flattenTree,
  subtreeGroupIds,
} from '@/data/group-tree';
import type { Sensor } from '@/data/types';
import {
  SensorGroupsDocument,
  SensorReadingsBucketedMultiDocument,
} from '@/graphql/sensors.generated';
import { useSearchState } from '@/lib/use-search-state';
import { type Scale } from './aggregate-chart-params';

const ALL = '__all__';

const round1 = (n: number | null | undefined) =>
  n == null ? '—' : Math.round(n * 10) / 10;

interface SeriesMeta {
  id: string;
  name: string;
  unit: string;
  color: string;
}
// Each row: bucket ISO + normalized value per sensor + the real avg (`real`).
type Row = {
  bucket: string;
  real: Record<string, number>;
} & Record<string, number | string | Record<string, number>>;

/** Build aligned rows per bucket. In `normalized` mode each sensor's avg is
 * scaled to its own 0–1 range; in `real` mode the plotted value is the avg
 * itself. The real avg is always kept per sensor for the tooltip. */
function buildSeries(
  buckets: { sensorId: string; bucket: string; avg: number | null }[],
  sensors: Sensor[],
  scale: Scale,
): { rows: Row[]; series: SeriesMeta[] } {
  const bySensor = new Map<string, { bucket: string; avg: number | null }[]>();
  for (const b of buckets) {
    const list = bySensor.get(b.sensorId);
    if (list) list.push(b);
    else bySensor.set(b.sensorId, [b]);
  }

  // Order + colors follow the stable `sensors` list, not data-arrival order, so a
  // sensor keeps its colour across live updates.
  const series: SeriesMeta[] = sensors
    .filter((s) => bySensor.has(s.id))
    .map((s, i) => ({
      id: s.id,
      name: s.name,
      unit: s.unit,
      color: SERIES_COLORS[i % SERIES_COLORS.length],
    }));

  const plotted = new Map<string, Map<string, number>>();
  const real = new Map<string, Map<string, number>>();
  for (const [id, bs] of bySensor) {
    const avgs = bs.flatMap((b) => (b.avg == null ? [] : [b.avg]));
    const min = Math.min(...avgs);
    const max = Math.max(...avgs);
    const span = max - min || 1;
    const pm = new Map<string, number>();
    const rm = new Map<string, number>();
    for (const b of bs) {
      if (b.avg != null) {
        pm.set(
          b.bucket,
          scale === 'real'
            ? b.avg
            : Math.round(((b.avg - min) / span) * 100) / 100,
        );
        rm.set(b.bucket, b.avg);
      }
    }
    plotted.set(id, pm);
    real.set(id, rm);
  }

  const allBuckets = [...new Set(buckets.map((b) => b.bucket))].sort();
  const rows: Row[] = allBuckets.map((bucket) => {
    const row: Row = { bucket, real: {} };
    for (const s of series) {
      const p = plotted.get(s.id)?.get(bucket);
      if (p !== undefined) {
        row[s.id] = p;
        row.real[s.id] = real.get(s.id)?.get(bucket) ?? 0;
      }
    }
    return row;
  });

  return { rows, series };
}

function CompareTooltip({
  active,
  payload,
  series,
  res,
}: {
  active?: boolean;
  payload?: { dataKey: string; payload: Row }[];
  series: SeriesMeta[];
  res: ReturnType<typeof useSearchState<'/aggregates'>>[0]['res'];
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
          const meta = series.find((s) => s.id === p.dataKey);
          if (!meta) return null;
          return (
            <span key={p.dataKey} className="contents">
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="size-2 rounded-full"
                  style={{ background: meta.color }}
                />
                {meta.name}
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

export function AggregateChart({ sensors }: { sensors: Sensor[] }) {
  const [{ res, range, from, to, group, type, scale }, setSearch] =
    useSearchState('/aggregates');
  const toggle = useSeriesToggle();

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);

  const { data: groupsData } = useQuery(SensorGroupsDocument, {
    context: { suppressErrorToast: true },
  });
  const groups = groupsData?.sensorGroups ?? [];
  const orderedGroups = flattenTree(buildGroupTree(groups));

  // Type options from the sensors present (dynamic types), keyed by typeKey.
  const typeOptions = [
    ...new Map(sensors.map((s) => [s.type, s.typeLabel])).entries(),
  ].sort((a, b) => a[1].localeCompare(b[1]));

  // Filter to the selected group's subtree and/or measurement type.
  const groupIds = group ? subtreeGroupIds(groups, group) : null;
  const filtered = sensors.filter(
    (s) =>
      (!groupIds || (s.groupId != null && groupIds.has(s.groupId))) &&
      (!type || s.type === type),
  );

  const { window, live } = resolveWindow({ res, range, from, to, now });
  const pointCount = estimatePoints(res, window.endMs - window.startMs);
  const tooMany = pointCount > MAX_POINTS;
  const sensorIds = filtered.map((s) => s.id);

  const { data, loading, error } = useQuery(
    SensorReadingsBucketedMultiDocument,
    {
      variables: {
        sensorIds,
        bucket: BUCKET_INTERVAL[res],
        start: new Date(window.startMs).toISOString(),
        end: new Date(window.endMs).toISOString(),
      },
      pollInterval: live ? 15_000 : undefined,
      skip: tooMany || sensorIds.length === 0,
      context: { suppressErrorToast: true },
    },
  );

  const { rows, series } = buildSeries(
    data?.sensorReadingsBucketedMulti ?? [],
    filtered,
    scale,
  );

  const setWindow = (w: TimeWindow) =>
    setSearch({
      from: new Date(w.startMs).toISOString(),
      to: new Date(w.endMs).toISOString(),
    });
  const goLive = () => setSearch({ from: undefined, to: undefined });
  const handleShift = (dir: -1 | 1) => {
    const next = shiftWindow(window, dir);
    if (dir === 1 && next.endMs >= Date.now()) goLive();
    else setWindow(next);
  };
  const handleApplyDates = (s: string, e: string) => {
    const w = datesToWindow(s, e);
    if (w) setWindow(w);
  };
  const handleReset = () =>
    setSearch({
      res: DEFAULT_RES,
      range: DEFAULT_RANGE,
      from: undefined,
      to: undefined,
      group: undefined,
      type: undefined,
      scale: 'normalized',
    });
  const isDefault =
    live &&
    res === DEFAULT_RES &&
    range === DEFAULT_RANGE &&
    !group &&
    !type &&
    scale === 'normalized';

  return (
    <div className="rounded-[14px] border border-border bg-card p-5 shadow-sm">
      <div className="mb-3">
        <h3 className="text-sm font-semibold">Cross-sensor comparison</h3>
        <div className="mt-0.5 text-xs text-muted-foreground">
          {RESOLUTION_LABEL[res].toLowerCase()} averages ·{' '}
          {scale === 'real'
            ? 'real values (filter to one type for a shared axis)'
            : 'each series normalized to its own range'}
        </div>
      </div>

      {/* Group + type filter and the y-axis scale toggle. */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Select
          value={group ?? ALL}
          onValueChange={(v) =>
            setSearch({ group: v === ALL ? undefined : v })
          }
        >
          <SelectTrigger size="sm" className="w-[170px]">
            <SelectValue placeholder="All groups" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All groups</SelectItem>
            {orderedGroups.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {'  '.repeat(g.depth)}
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={type ?? ALL}
          onValueChange={(v) => setSearch({ type: v === ALL ? undefined : v })}
        >
          <SelectTrigger size="sm" className="w-[150px]">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All types</SelectItem>
            {typeOptions.map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto inline-flex overflow-hidden rounded-md border border-border">
          {(['normalized', 'real'] as const).map((s) => (
            <Button
              key={s}
              type="button"
              variant={scale === s ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 rounded-none px-2.5 text-[12px]"
              onClick={() => setSearch({ scale: s })}
            >
              {s === 'normalized' ? 'Normalized' : 'Real'}
            </Button>
          ))}
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
        onShift={handleShift}
        onLive={goLive}
        onApplyDates={handleApplyDates}
        onReset={handleReset}
        canReset={!isDefault}
      />

      {series.length > 0 && (
        <InteractiveLegend
          className="mb-1 mt-3 gap-3.5"
          marker="line"
          textClassName="text-[11.5px] text-muted-foreground"
          items={series.map((s) => ({
            key: s.id,
            label: s.name,
            color: s.color,
          }))}
          hidden={toggle.hidden}
          toggle={toggle.toggle}
          setHovered={toggle.setHovered}
        />
      )}

      <div className="mt-3">
        {tooMany ? (
          <div className="flex h-[260px] items-center justify-center text-center text-[12.5px] text-muted-foreground">
            That’s ~{pointCount.toLocaleString()} buckets — too many to chart.
            Pick a coarser resolution or a shorter range.
          </div>
        ) : error ? (
          <div className="flex h-[260px] items-center justify-center text-center text-[12.5px] text-alert">
            Couldn’t load readings: {error.message}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-[260px] items-center justify-center text-center text-[12.5px] text-muted-foreground">
            No sensors match this filter.
          </div>
        ) : loading && rows.length === 0 ? (
          <Skeleton className="h-[260px] w-full rounded-md" />
        ) : rows.length === 0 ? (
          <div className="flex h-[260px] items-center justify-center text-center text-[12.5px] text-muted-foreground">
            No readings in this window.
          </div>
        ) : (
          <div className="h-[260px] w-full">
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
                  width={scale === 'real' ? 48 : 36}
                  domain={scale === 'real' ? ['auto', 'auto'] : [0, 1]}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10.5, fill: 'var(--muted-2)' }}
                />
                <Tooltip
                  cursor={{ stroke: 'var(--border)' }}
                  content={({ active, payload }) => (
                    <CompareTooltip
                      active={active}
                      payload={
                        payload as unknown as {
                          dataKey: string;
                          payload: Row;
                        }[]
                      }
                      series={series}
                      res={res}
                    />
                  )}
                />
                {series.map((s) => {
                  const st = toggle.seriesProps(s.id);
                  return (
                    <Line
                      key={s.id}
                      dataKey={s.id}
                      type="monotone"
                      stroke={s.color}
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
