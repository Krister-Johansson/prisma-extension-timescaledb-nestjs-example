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
import { Skeleton } from '@/components/ui/skeleton';
import { SERIES_COLORS } from '@/data/aggregates';
import {
  DEFAULT_RANGE,
  DEFAULT_RES,
} from '@/components/sensor-detail/chart-params';
import type { Sensor } from '@/data/types';
import { SensorReadingsBucketedMultiDocument } from '@/graphql/sensors.generated';
import { useSearchState } from '@/lib/use-search-state';

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

/** Normalize each sensor's avg to its own 0–1 range and align rows by bucket;
 * keep the real avg per sensor for the tooltip. */
function buildSeries(
  buckets: { sensorId: string; bucket: string; avg: number | null }[],
  sensors: Sensor[],
): { rows: Row[]; series: SeriesMeta[] } {
  const byId = new Map(sensors.map((s) => [s.id, s]));
  const bySensor = new Map<string, { bucket: string; avg: number | null }[]>();
  for (const b of buckets) {
    const list = bySensor.get(b.sensorId);
    if (list) list.push(b);
    else bySensor.set(b.sensorId, [b]);
  }

  const series: SeriesMeta[] = [...bySensor.keys()].map((id, i) => ({
    id,
    name: byId.get(id)?.name ?? 'Sensor',
    unit: byId.get(id)?.unit ?? '',
    color: SERIES_COLORS[i % SERIES_COLORS.length],
  }));

  const norm = new Map<string, Map<string, number>>();
  const real = new Map<string, Map<string, number>>();
  for (const [id, bs] of bySensor) {
    const avgs = bs.flatMap((b) => (b.avg == null ? [] : [b.avg]));
    const min = Math.min(...avgs);
    const max = Math.max(...avgs);
    const span = max - min || 1;
    const nm = new Map<string, number>();
    const rm = new Map<string, number>();
    for (const b of bs) {
      if (b.avg != null) {
        nm.set(b.bucket, Math.round(((b.avg - min) / span) * 100) / 100);
        rm.set(b.bucket, b.avg);
      }
    }
    norm.set(id, nm);
    real.set(id, rm);
  }

  const allBuckets = [...new Set(buckets.map((b) => b.bucket))].sort();
  const rows: Row[] = allBuckets.map((bucket) => {
    const row: Row = { bucket, real: {} };
    for (const s of series) {
      const n = norm.get(s.id)?.get(bucket);
      if (n !== undefined) {
        row[s.id] = n;
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
  const [{ res, range, from, to }, setSearch] = useSearchState('/aggregates');

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);

  const { window, live } = resolveWindow({ res, range, from, to, now });
  const pointCount = estimatePoints(res, window.endMs - window.startMs);
  const tooMany = pointCount > MAX_POINTS;
  const sensorIds = sensors.map((s) => s.id);

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
    sensors,
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
    });
  const isDefault = live && res === DEFAULT_RES && range === DEFAULT_RANGE;

  return (
    <div className="rounded-[14px] border border-border bg-card p-5 shadow-sm">
      <div className="mb-3">
        <h3 className="text-sm font-semibold">Cross-sensor comparison</h3>
        <div className="mt-0.5 text-xs text-muted-foreground">
          {RESOLUTION_LABEL[res].toLowerCase()} averages · each series
          normalized to its own range
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
        <div className="mb-1 mt-3 flex flex-wrap gap-3.5">
          {series.map((s) => (
            <span
              key={s.id}
              className="inline-flex items-center gap-1.5 text-[11.5px] text-muted-foreground"
            >
              <span
                className="h-[3px] w-2.5 rounded"
                style={{ background: s.color }}
              />
              {s.name}
            </span>
          ))}
        </div>
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
                  width={36}
                  domain={[0, 1]}
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
                {series.map((s) => (
                  <Line
                    key={s.id}
                    dataKey={s.id}
                    type="monotone"
                    stroke={s.color}
                    strokeWidth={1.8}
                    dot={false}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
