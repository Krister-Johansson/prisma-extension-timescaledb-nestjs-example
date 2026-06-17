import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { compareSeries } from '@/data/aggregates';

export function AggregateCompareChart() {
  const { data, series } = compareSeries();
  const config = Object.fromEntries(
    series.map((s) => [s.id, { label: s.name, color: s.color }]),
  ) satisfies ChartConfig;

  return (
    <div className="rounded-[14px] border border-border bg-card p-5 shadow-sm">
      <div className="text-sm font-semibold">Hourly averages · cross-sensor</div>
      <div className="mb-3 mt-0.5 text-xs text-muted-foreground">
        Each series normalized to its own min–max range for comparison
      </div>
      <div className="mb-2 flex flex-wrap gap-3.5">
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
      <ChartContainer config={config} className="h-[260px] w-full">
        <LineChart data={data} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis
            dataKey="hour"
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
          <ChartTooltip content={<ChartTooltipContent />} />
        </LineChart>
      </ChartContainer>
    </div>
  );
}
