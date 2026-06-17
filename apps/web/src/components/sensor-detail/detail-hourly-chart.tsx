import { Bar, BarChart, CartesianGrid, ErrorBar, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { hourly } from '@/data/detail';
import type { Sensor } from '@/data/types';

const config = {
  avg: { label: 'Average', color: 'var(--primary)' },
} satisfies ChartConfig;

export function DetailHourlyChart({ sensor }: { sensor: Sensor }) {
  const data = hourly(sensor).map((h) => ({
    ...h,
    // Asymmetric whisker: [avg − min, max − avg]
    errorY: [
      Math.round((h.avg - h.min) * 10) / 10,
      Math.round((h.max - h.avg) * 10) / 10,
    ] as [number, number],
  }));

  return (
    <div className="rounded-[14px] border border-border bg-card p-5 shadow-sm">
      <div className="text-sm font-semibold">Hourly aggregates</div>
      <div className="mb-2 mt-0.5 text-xs text-muted-foreground">
        Bars = avg · whiskers = min–max range
      </div>
      <ChartContainer config={config} className="h-[260px] w-full">
        <BarChart data={data} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
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
            domain={['auto', 'auto']}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10.5, fill: 'var(--muted-2)' }}
          />
          <Bar
            dataKey="avg"
            fill="var(--primary)"
            fillOpacity={0.82}
            radius={2}
            isAnimationActive={false}
          >
            <ErrorBar
              dataKey="errorY"
              width={3}
              strokeWidth={1.2}
              stroke="var(--foreground)"
              direction="y"
            />
          </Bar>
          <ChartTooltip content={<ChartTooltipContent />} />
        </BarChart>
      </ChartContainer>
    </div>
  );
}
