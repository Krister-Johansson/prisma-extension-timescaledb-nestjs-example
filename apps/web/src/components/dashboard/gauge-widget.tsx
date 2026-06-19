import { useMemo } from 'react';
import { SystemGauge } from '@/components/system/system-gauge';
import type { WidgetFieldsFragment } from '@/graphql/dashboards.generated';
import { useCatalog } from './use-catalog';
import { useStatData } from './use-stat-data';
import { gaugeConfigComplete, parseGaugeConfig } from './widget-config';

const fmt = (n: number) => (Math.abs(n) >= 100 ? n.toFixed(0) : n.toFixed(1));

export function GaugeWidget({ widget }: { widget: WidgetFieldsFragment }) {
  const cfg = useMemo(() => parseGaugeConfig(widget.config), [widget.config]);
  const catalog = useCatalog();
  const data = useStatData({
    scope: cfg.scope,
    sensorId: cfg.sensorId,
    groupId: cfg.groupId,
    typeKey: cfg.typeKey,
    agg: cfg.agg,
    window: cfg.window,
  });

  if (!gaugeConfigComplete(cfg)) {
    return (
      <div className="flex h-full items-center justify-center px-2 text-center text-[11px] text-muted-2">
        Open settings (⚙) to pick a source + range.
      </div>
    );
  }

  const unit =
    cfg.scope === 'sensor'
      ? (catalog.sensorById.get(cfg.sensorId ?? '')?.type.unit ?? '')
      : (catalog.typeByKey.get(cfg.typeKey ?? '')?.unit ?? '');
  const caption =
    cfg.scope === 'sensor'
      ? (catalog.sensorById.get(cfg.sensorId ?? '')?.name ?? '')
      : `${catalog.groupById.get(cfg.groupId ?? '')?.name ?? ''} · ${
          catalog.typeByKey.get(cfg.typeKey ?? '')?.label ?? cfg.typeKey
        }`;

  const v = data.value;
  const span = cfg.max - cfg.min || 1;
  const percent = v == null ? 0 : Math.min(1, Math.max(0, (v - cfg.min) / span));
  const color =
    v == null
      ? 'var(--muted-2)'
      : cfg.danger != null && v >= cfg.danger
        ? 'var(--alert)'
        : cfg.warn != null && v >= cfg.warn
          ? 'var(--warn)'
          : 'var(--primary)';

  return (
    <div className="flex h-full items-center justify-center">
      <SystemGauge
        percent={percent}
        value={v == null ? '—' : `${fmt(v)}${unit ? ` ${unit}` : ''}`}
        caption={caption}
        color={color}
      />
    </div>
  );
}
