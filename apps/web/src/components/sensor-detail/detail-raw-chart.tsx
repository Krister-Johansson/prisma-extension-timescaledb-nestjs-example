import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { readings } from '@/data/detail';
import type { Sensor } from '@/data/types';

const config = {
  value: { label: 'Reading' },
} satisfies ChartConfig;

export function DetailRawChart({ sensor }: { sensor: Sensor }) {
  const data = readings(sensor);
  const color = sensor.status === 'ALERTING' ? 'var(--alert)' : 'var(--primary)';

  const values = data.map((d) => d.value);
  let lo = values.length ? Math.min(...values) : 0;
  let hi = values.length ? Math.max(...values) : 1;
  if (sensor.rule) {
    lo = Math.min(lo, sensor.rule.threshold, sensor.rule.clearThreshold);
    hi = Math.max(hi, sensor.rule.threshold, sensor.rule.clearThreshold);
  }
  const pad = (hi - lo) * 0.12 || 1;
  const domain: [number, number] = [Math.floor(lo - pad), Math.ceil(hi + pad)];

  return (
    <div className="rounded-[14px] border border-border bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold">Raw readings · last 24h</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            Time-series with alert threshold and reset band
          </div>
        </div>
        {sensor.rule ? (
          <div className="flex items-center gap-4 font-mono text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-[3px] w-3.5 rounded bg-alert" />
              threshold
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-3.5 rounded bg-warn opacity-30" />
              reset band
            </span>
          </div>
        ) : null}
      </div>

      <ChartContainer config={config} className="h-[260px] w-full">
        <AreaChart data={data} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="raw-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.18} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis
            dataKey="time"
            tickLine={false}
            axisLine={false}
            minTickGap={56}
            tick={{ fontSize: 10.5, fill: 'var(--muted-2)' }}
          />
          <YAxis
            width={36}
            domain={domain}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10.5, fill: 'var(--muted-2)' }}
          />
          {sensor.rule ? (
            <ReferenceArea
              y1={sensor.rule.clearThreshold}
              y2={sensor.rule.threshold}
              fill="var(--warn)"
              fillOpacity={0.14}
            />
          ) : null}
          {sensor.rule ? (
            <ReferenceLine
              y={sensor.rule.threshold}
              stroke="var(--alert)"
              strokeDasharray="5 4"
            />
          ) : null}
          <Area
            dataKey="value"
            type="monotone"
            stroke={color}
            strokeWidth={1.8}
            fill="url(#raw-fill)"
            dot={false}
            isAnimationActive={false}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}
