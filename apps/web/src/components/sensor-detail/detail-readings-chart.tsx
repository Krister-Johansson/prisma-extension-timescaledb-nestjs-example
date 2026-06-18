import { useQuery } from '@apollo/client/react';
import { useEffect, useState } from 'react';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  type ChartConfig,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { SensorReadingsBucketedDocument } from '@/graphql/sensors.generated';

const WINDOW_MIN = 60;
const MINUTE = 60_000;

const config = {
  avg: { label: 'Average', color: 'var(--primary)' },
} satisfies ChartConfig;

/**
 * Live per-minute average over the last hour (TimescaleDB time_bucket). The
 * window slides on a coarse clock so query variables stay stable within a
 * minute; polling keeps the current window fresh.
 */
export function DetailReadingsChart({
  sensorId,
  unit,
}: {
  sensorId: string;
  unit: string;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);

  const endMs = Math.ceil(now / MINUTE) * MINUTE;
  const start = new Date(endMs - WINDOW_MIN * MINUTE).toISOString();
  const end = new Date(endMs).toISOString();

  const { data, loading } = useQuery(SensorReadingsBucketedDocument, {
    variables: { sensorId, bucket: '1 minute', start, end },
    pollInterval: 15_000,
    context: { suppressErrorToast: true },
  });

  const points = (data?.sensorReadingsBucketed ?? []).map((b) => ({
    t: new Date(b.bucket).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    }),
    avg: b.avg,
  }));

  return (
    <div className="rounded-[14px] border border-border bg-card p-5 shadow-sm">
      <h3 className="text-sm font-semibold">Recent readings</h3>
      <div className="mb-3 mt-0.5 text-xs text-muted-foreground">
        Per-minute average over the last hour ({unit})
      </div>
      {loading && !data ? (
        <Skeleton className="h-[220px] w-full rounded-md" />
      ) : points.length === 0 ? (
        <div className="flex h-[220px] items-center justify-center text-center text-[12.5px] text-muted-foreground">
          No readings in the last hour — start an emulator for this sensor.
        </div>
      ) : (
        <ChartContainer config={config} className="h-[220px] w-full">
          <LineChart data={points} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            <XAxis
              dataKey="t"
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
            <Line
              dataKey="avg"
              type="monotone"
              stroke="var(--primary)"
              strokeWidth={1.8}
              dot={false}
              isAnimationActive={false}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
          </LineChart>
        </ChartContainer>
      )}
    </div>
  );
}
