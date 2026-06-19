import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { WidgetFieldsFragment } from '@/graphql/dashboards.generated';
import { useChartData, type ChartSeriesMeta } from './use-chart-data';
import {
  parseChartConfig,
  WINDOW_LABEL,
  type ChartType,
} from './widget-config';

const axisTick = { fontSize: 9.5, fill: 'var(--muted-2)' } as const;

const fmtAxis = (iso: string, window: string) => {
  const d = new Date(iso);
  return /7d|30d/.test(window)
    ? d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
};
const fmtVal = (n: number) => (Math.abs(n) >= 100 ? n.toFixed(0) : n.toFixed(1));

interface TipPayload {
  name?: string;
  value?: number;
  color?: string;
}
function ChartTip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TipPayload[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-popover px-2 py-1 text-[11px] shadow-md">
      <div className="mb-0.5 text-muted-2">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span className="size-2 rounded-full" style={{ background: p.color }} />
          <span className="max-w-[140px] truncate">{p.name}</span>
          <span className="ml-auto font-medium">
            {p.value == null ? '—' : fmtVal(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

function renderSeries(type: ChartType, s: ChartSeriesMeta) {
  if (type === 'area')
    return (
      <Area
        key={s.key}
        dataKey={s.key}
        name={s.label}
        type="monotone"
        stroke={s.color}
        fill={s.color}
        fillOpacity={0.15}
        strokeWidth={1.8}
        dot={false}
        connectNulls
      />
    );
  if (type === 'bar')
    return <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} />;
  return (
    <Line
      key={s.key}
      dataKey={s.key}
      name={s.label}
      type="monotone"
      stroke={s.color}
      strokeWidth={1.8}
      dot={false}
      connectNulls
    />
  );
}

export function ChartWidget({ widget }: { widget: WidgetFieldsFragment }) {
  const cfg = useMemo(() => parseChartConfig(widget.config), [widget.config]);
  const data = useChartData(cfg);

  if (data.series.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-2 text-center text-[11px] text-muted-2">
        Open settings (⚙) to add one or more series.
      </div>
    );
  }

  const rows = data.rows.map((r) => ({
    ...r,
    label: fmtAxis(r.t as string, cfg.window),
  }));
  const Chart =
    cfg.chartType === 'area'
      ? AreaChart
      : cfg.chartType === 'bar'
        ? BarChart
        : LineChart;

  return (
    <div className="flex h-full flex-col">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="truncate text-[11px] text-muted-2">
          {WINDOW_LABEL[cfg.window]}
        </span>
        {data.unit && <span className="text-[10px] text-muted-2">{data.unit}</span>}
      </div>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <Chart data={rows} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            <XAxis dataKey="label" minTickGap={28} tick={axisTick} />
            <YAxis width={32} tick={axisTick} domain={['auto', 'auto']} />
            <Tooltip content={<ChartTip />} />
            {data.series.map((s) => renderSeries(cfg.chartType, s))}
          </Chart>
        </ResponsiveContainer>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
        {data.series.map((s) => (
          <span key={s.key} className="flex items-center gap-1 text-[10px]">
            <span
              className="size-2 rounded-full"
              style={{ background: s.color }}
            />
            <span className="max-w-[120px] truncate">{s.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
