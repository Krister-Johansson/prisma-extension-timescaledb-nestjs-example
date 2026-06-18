import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DEFAULT_RANGE,
  DEFAULT_RES,
  formatBucketLabel,
  RESOLUTION_LABEL,
} from './chart-params';
import { datesToWindow, shiftWindow, type TimeWindow } from './chart-window';
import { DetailChartControls } from './detail-chart-controls';
import type { ReadingsBuckets } from './use-readings-buckets';

const round1 = (n: number | null | undefined) =>
  n == null ? '—' : Math.round(n * 10) / 10;

interface Point {
  label: string;
  avg: number | null;
  min: number | null;
  max: number | null;
  count: number;
}

function ReadingsTooltip({
  active,
  payload,
  unit,
}: {
  active?: boolean;
  payload?: { payload: Point }[];
  unit: string;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-md border border-border bg-card px-2.5 py-2 text-[11px] shadow-md">
      <div className="font-mono font-semibold">{p.label}</div>
      <div className="mt-1 grid grid-cols-[auto_auto] gap-x-3 gap-y-0.5 font-mono">
        <span className="text-muted-foreground">avg</span>
        <span className="text-right font-semibold">
          {round1(p.avg)} {unit}
        </span>
        <span className="text-muted-foreground">min</span>
        <span className="text-right">{round1(p.min)}</span>
        <span className="text-muted-foreground">max</span>
        <span className="text-right">{round1(p.max)}</span>
        <span className="text-muted-foreground">count</span>
        <span className="text-right">{p.count}</span>
      </div>
    </div>
  );
}

/**
 * Presentational readings chart. The window/query state comes from
 * `useReadingsBuckets` (shared with the data table); this renders the controls,
 * the avg line, and an avg / min / max / count tooltip per bucket.
 */
export function DetailReadingsChart({
  data,
  unit,
}: {
  data: ReadingsBuckets;
  unit: string;
}) {
  const { res, range, live, window, tooMany, pointCount, buckets, loading, error, setSearch } =
    data;

  const series: Point[] = buckets.map((b) => ({
    label: formatBucketLabel(b.bucket, res),
    avg: b.avg,
    min: b.min,
    max: b.max,
    count: b.count,
  }));

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
  const handleApplyDates = (startDate: string, endDate: string) => {
    const w = datesToWindow(startDate, endDate);
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
        <h3 className="text-sm font-semibold">Readings</h3>
        <div className="mt-0.5 text-xs text-muted-foreground">
          {RESOLUTION_LABEL[res].toLowerCase()} buckets · {unit}
        </div>
      </div>

      <DetailChartControls
        res={res}
        range={range}
        live={live}
        window={window}
        onResChange={(r) => setSearch({ res: r })}
        onRangeChange={(r) => setSearch({ range: r, from: undefined, to: undefined })}
        onShift={handleShift}
        onLive={goLive}
        onApplyDates={handleApplyDates}
        onReset={handleReset}
        canReset={!isDefault}
      />

      <div className="mt-3">
        {tooMany ? (
          <div className="flex h-[240px] items-center justify-center text-center text-[12.5px] text-muted-foreground">
            That’s ~{pointCount.toLocaleString()} buckets — too many to chart.
            Pick a coarser resolution or a shorter range.
          </div>
        ) : error ? (
          <div className="flex h-[240px] items-center justify-center text-center text-[12.5px] text-alert">
            Couldn’t load readings: {error.message}
          </div>
        ) : loading && buckets.length === 0 ? (
          <Skeleton className="h-[240px] w-full rounded-md" />
        ) : series.length === 0 ? (
          <div className="flex h-[240px] items-center justify-center text-center text-[12.5px] text-muted-foreground">
            No readings in this window — try a different range or resolution.
          </div>
        ) : (
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={series}
                margin={{ left: 4, right: 8, top: 8, bottom: 0 }}
              >
                <CartesianGrid vertical={false} stroke="var(--grid)" />
                <XAxis
                  dataKey="label"
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
                  content={({ active, payload }) => (
                    <ReadingsTooltip
                      active={active}
                      payload={
                        payload as unknown as { payload: Point }[] | undefined
                      }
                      unit={unit}
                    />
                  )}
                />
                <Line
                  dataKey="avg"
                  type="monotone"
                  stroke="var(--primary)"
                  strokeWidth={1.8}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
