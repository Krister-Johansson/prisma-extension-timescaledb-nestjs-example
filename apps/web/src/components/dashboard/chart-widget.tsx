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
import { InteractiveLegend } from '@/components/charts/interactive-legend';
import {
  dimStroke,
  useSeriesToggle,
} from '@/components/charts/use-series-toggle';
import { useChartData, type ChartSeriesMeta } from './use-chart-data';
import {
  parseChartConfig,
  windowIsMultiDay,
  windowLabel,
  type ChartType,
} from './widget-config';

const axisTick = { fontSize: 9.5, fill: 'var(--muted-2)' } as const;

const fmtAxis = (iso: string, multiDay: boolean) => {
  const d = new Date(iso);
  return multiDay
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
  // `label` is the point's ISO timestamp (the x dataKey); show date + time so
  // the hovered point is unambiguous.
  const when = label
    ? new Date(label).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';
  return (
    <div className="rounded-md border border-border bg-popover px-2 py-1 text-[11px] shadow-md">
      <div className="mb-0.5 text-muted-2">{when}</div>
      {payload.map((p, i) => (
        <div key={p.name ?? i} className="flex items-center gap-1.5">
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

function renderSeries(
  type: ChartType,
  s: ChartSeriesMeta,
  st: { hide: boolean; dim: boolean },
) {
  if (type === 'area')
    return (
      <Area
        key={s.key}
        dataKey={s.key}
        name={s.label}
        type="monotone"
        stroke={s.color}
        fill={s.color}
        fillOpacity={st.dim ? 0.04 : 0.15}
        strokeOpacity={dimStroke(st.dim)}
        hide={st.hide}
        strokeWidth={1.8}
        dot={false}
        connectNulls
      />
    );
  if (type === 'bar')
    return (
      <Bar
        key={s.key}
        dataKey={s.key}
        name={s.label}
        fill={s.color}
        fillOpacity={st.dim ? 0.25 : 1}
        hide={st.hide}
      />
    );
  return (
    <Line
      key={s.key}
      dataKey={s.key}
      name={s.label}
      type="monotone"
      stroke={s.color}
      strokeOpacity={dimStroke(st.dim)}
      hide={st.hide}
      strokeWidth={1.8}
      dot={false}
      connectNulls
    />
  );
}

export function ChartWidget({ widget }: { widget: WidgetFieldsFragment }) {
  const cfg = useMemo(() => parseChartConfig(widget.config), [widget.config]);
  const data = useChartData(cfg);
  // Reset visibility when the series set changes (keys are positional).
  const toggle = useSeriesToggle(data.series.length);

  if (data.series.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-2 text-center text-[11px] text-muted-2">
        Open settings (⚙) to add one or more series.
      </div>
    );
  }

  const multiDay = windowIsMultiDay(cfg.window);
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
          {windowLabel(cfg.window)}
        </span>
        {data.unit && <span className="text-[10px] text-muted-2">{data.unit}</span>}
      </div>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <Chart data={data.rows} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            <XAxis
              dataKey="t"
              tickFormatter={(t: string) => fmtAxis(t, multiDay)}
              minTickGap={multiDay ? 44 : 28}
              tick={axisTick}
            />
            <YAxis width={32} tick={axisTick} domain={['auto', 'auto']} />
            <Tooltip content={<ChartTip />} />
            {data.series.map((s) =>
              renderSeries(cfg.chartType, s, toggle.seriesProps(s.key)),
            )}
          </Chart>
        </ResponsiveContainer>
      </div>
      <InteractiveLegend
        className="mt-1 gap-x-3 gap-y-0.5"
        items={data.series}
        hidden={toggle.hidden}
        toggle={toggle.toggle}
        setHovered={toggle.setHovered}
      />
    </div>
  );
}
