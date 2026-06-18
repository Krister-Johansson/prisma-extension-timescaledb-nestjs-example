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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { SensorReadingsBucketedDocument } from '@/graphql/sensors.generated';
import { useSearchState } from '@/lib/use-search-state';
import {
  BUCKET_INTERVAL,
  BUCKET_MS,
  estimatePoints,
  formatBucketLabel,
  MAX_POINTS,
  RANGE_LABEL,
  RANGE_MS,
  RANGES,
  type RangeKey,
  type Resolution,
  RESOLUTION_LABEL,
  RESOLUTIONS,
} from './chart-params';

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
 * URL-driven readings chart: pick a resolution (bucket size) and a time range;
 * both live in the URL so the view is shareable. Relative ranges poll and slide
 * with a coarse clock (the window snaps to bucket boundaries so query variables
 * stay stable). The tooltip shows avg / min / max / count per bucket.
 */
export function DetailReadingsChart({
  sensorId,
  unit,
}: {
  sensorId: string;
  unit: string;
}) {
  const [{ res, range }, setSearch] = useSearchState('/sensors/$sensorId/');

  const bucketMs = BUCKET_MS[res];
  const spanMs = RANGE_MS[range];
  const points = estimatePoints(res, spanMs);
  const tooMany = points > MAX_POINTS;

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);

  // Snap the window end up to a bucket boundary so the variables (and cache key)
  // only change when a new bucket opens; polling keeps the window fresh.
  const endMs = Math.ceil(now / bucketMs) * bucketMs;
  const start = new Date(endMs - spanMs).toISOString();
  const end = new Date(endMs).toISOString();

  const { data, loading, error } = useQuery(SensorReadingsBucketedDocument, {
    variables: { sensorId, bucket: BUCKET_INTERVAL[res], start, end },
    pollInterval: 15_000,
    skip: tooMany,
    context: { suppressErrorToast: true },
  });

  const series: Point[] = (data?.sensorReadingsBucketed ?? []).map((b) => ({
    label: formatBucketLabel(b.bucket, res),
    avg: b.avg,
    min: b.min,
    max: b.max,
    count: b.count,
  }));

  return (
    <div className="rounded-[14px] border border-border bg-card p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Readings</h3>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {RESOLUTION_LABEL[res].toLowerCase()} buckets · {unit}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 font-mono text-[10.5px] text-muted-2">
            <span className="size-[7px] animate-pulse rounded-full bg-ok" />
            LIVE
          </span>
          <Select
            value={res}
            onValueChange={(v) => setSearch({ res: v as Resolution })}
          >
            <SelectTrigger size="sm" className="w-[108px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RESOLUTIONS.map((r) => (
                <SelectItem key={r} value={r}>
                  {RESOLUTION_LABEL[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={range}
            onValueChange={(v) => setSearch({ range: v as RangeKey })}
          >
            <SelectTrigger size="sm" className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANGES.map((r) => (
                <SelectItem key={r} value={r}>
                  {RANGE_LABEL[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {tooMany ? (
        <div className="flex h-[240px] items-center justify-center text-center text-[12.5px] text-muted-foreground">
          That’s ~{points.toLocaleString()} buckets — too many to chart. Pick a
          coarser resolution or a shorter range.
        </div>
      ) : error ? (
        <div className="flex h-[240px] items-center justify-center text-center text-[12.5px] text-alert">
          Couldn’t load readings: {error.message}
        </div>
      ) : loading && !data ? (
        <Skeleton className="h-[240px] w-full rounded-md" />
      ) : series.length === 0 ? (
        <div className="flex h-[240px] items-center justify-center text-center text-[12.5px] text-muted-foreground">
          No readings in this window — start an emulator or widen the range.
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
  );
}
