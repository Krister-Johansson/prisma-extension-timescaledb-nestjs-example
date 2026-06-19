import { useMemo } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { InteractiveLegend } from '@/components/charts/interactive-legend';
import {
  dimStroke,
  useSeriesToggle,
} from '@/components/charts/use-series-toggle';
import {
  PERIOD_UNIT_LABEL,
  type PeriodSeriesMeta,
} from '@/components/charts/period-series';
import type { WidgetFieldsFragment } from '@/graphql/dashboards.generated';
import { useCatalog } from './use-catalog';
import { usePeriodData } from './use-period-data';
import { compareConfigComplete, parseCompareConfig } from './widget-config';

const axisTick = { fontSize: 9.5, fill: 'var(--muted-2)' } as const;
const fmtVal = (n: number | null | undefined) =>
  n == null ? '—' : Math.abs(n) >= 100 ? n.toFixed(0) : n.toFixed(1);

interface TipPayload {
  dataKey?: string;
  value?: number | null;
}
function CompareTip({
  active,
  payload,
  series,
  unit,
}: {
  active?: boolean;
  payload?: TipPayload[];
  series: PeriodSeriesMeta[];
  unit: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-popover px-2 py-1 text-[11px] shadow-md">
      {payload.map((p) => {
        const meta = series.find((s) => s.key === p.dataKey);
        if (!meta) return null;
        return (
          <div key={p.dataKey} className="flex items-center gap-1.5">
            <span
              className="size-2 rounded-full"
              style={{ background: meta.color }}
            />
            <span className="max-w-[120px] truncate">{meta.label}</span>
            <span className="ml-auto font-medium">
              {fmtVal(p.value)} {unit}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function CompareWidget({ widget }: { widget: WidgetFieldsFragment }) {
  const cfg = useMemo(() => parseCompareConfig(widget.config), [widget.config]);
  const catalog = useCatalog();
  const { rows, series } = usePeriodData(cfg);
  const toggle = useSeriesToggle(cfg.count);

  if (!compareConfigComplete(cfg)) {
    return (
      <div className="flex h-full items-center justify-center px-2 text-center text-[11px] text-muted-2">
        Open settings (⚙) to pick a group + type to compare.
      </div>
    );
  }

  const unit = catalog.typeByKey.get(cfg.typeKey ?? '')?.unit ?? '';
  const source = `${catalog.groupById.get(cfg.groupId ?? '')?.name ?? '—'} · ${
    catalog.typeByKey.get(cfg.typeKey ?? '')?.label ?? cfg.typeKey
  }`;
  // The latest period spans [now − period, now]; format ticks within it.
  const fmtTick = (t: number) =>
    new Date(t).toLocaleDateString(undefined, {
      weekday: cfg.unit === 'week' ? 'short' : undefined,
      month: cfg.unit === 'week' ? undefined : 'short',
      day: cfg.unit === 'week' ? undefined : 'numeric',
      hour: cfg.unit === 'day' ? '2-digit' : undefined,
    });

  return (
    <div className="flex h-full flex-col">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="truncate text-[11px] text-muted-2">
          {source} · last {cfg.count * cfg.amount}{' '}
          {PERIOD_UNIT_LABEL[cfg.unit].toLowerCase()}
        </span>
        {unit && <span className="text-[10px] text-muted-2">{unit}</span>}
      </div>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            <XAxis
              dataKey="t"
              tickFormatter={fmtTick}
              minTickGap={36}
              tick={axisTick}
            />
            <YAxis width={32} tick={axisTick} domain={['auto', 'auto']} />
            <Tooltip content={<CompareTip series={series} unit={unit} />} />
            {series.map((s) => {
              const st = toggle.seriesProps(s.key);
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
                  isAnimationActive={false}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <InteractiveLegend
        className="mt-1 gap-x-3 gap-y-0.5"
        items={series}
        hidden={toggle.hidden}
        toggle={toggle.toggle}
        setHovered={toggle.setHovered}
      />
    </div>
  );
}
