import type { SensorStatus } from '@/data/types';
import type { WidgetFieldsFragment } from '@/graphql/dashboards.generated';
import { SensorSparkline } from '@/components/sensor/sensor-sparkline';
import { useCatalog } from './use-catalog';
import { useStatData } from './use-stat-data';
import {
  parseStatConfig,
  statConfigComplete,
  STAT_AGG_LABEL,
  WINDOW_LABEL,
} from './widget-config';

const fmt = (n: number | null) =>
  n == null ? '—' : Math.abs(n) >= 100 ? n.toFixed(0) : n.toFixed(1);

export function StatWidget({ widget }: { widget: WidgetFieldsFragment }) {
  const cfg = parseStatConfig(widget.config);
  const catalog = useCatalog();
  const data = useStatData(cfg);

  if (!statConfigComplete(cfg)) {
    return (
      <div className="flex h-full items-center justify-center px-2 text-center text-[11px] text-muted-2">
        Open settings (⚙) to pick a sensor or group.
      </div>
    );
  }

  const unit =
    cfg.scope === 'sensor'
      ? (catalog.sensorById.get(cfg.sensorId ?? '')?.type.unit ?? '')
      : (catalog.typeByKey.get(cfg.typeKey ?? '')?.unit ?? '');
  const source =
    cfg.scope === 'sensor'
      ? (catalog.sensorById.get(cfg.sensorId ?? '')?.name ?? '—')
      : `${catalog.groupById.get(cfg.groupId ?? '')?.name ?? '—'} · ${
          catalog.typeByKey.get(cfg.typeKey ?? '')?.label ?? cfg.typeKey
        }`;

  const series = data.points
    .map((p) => p.value)
    .filter((v): v is number => v != null);

  return (
    <div className="flex h-full flex-col justify-between gap-1">
      <div className="truncate text-[10.5px] uppercase tracking-wide text-muted-2">
        {STAT_AGG_LABEL[cfg.agg]} · {WINDOW_LABEL[cfg.window]}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-semibold tabular-nums">
          {fmt(data.value)}
        </span>
        {unit && <span className="text-sm text-muted-2">{unit}</span>}
      </div>
      <div className="truncate text-[11px] text-muted-foreground">{source}</div>
      {cfg.sparkline && series.length > 1 && (
        <div className="mt-1 h-9">
          <SensorSparkline series={series} status={'OK' as SensorStatus} />
        </div>
      )}
    </div>
  );
}
