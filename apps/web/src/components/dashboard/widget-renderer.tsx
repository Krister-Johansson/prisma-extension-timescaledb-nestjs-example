import { LayoutDashboard } from 'lucide-react';
import type { WidgetFieldsFragment } from '@/graphql/dashboards.generated';
import { AlertsWidget } from './alerts-widget';
import { ChartWidget } from './chart-widget';
import { CompareWidget } from './compare-widget';
import { GaugeWidget } from './gauge-widget';
import { StatWidget } from './stat-widget';
import { TableWidget } from './table-widget';
import { WIDGET_TYPES } from './widget-meta';

/** Maps a widget to its renderer. */
export function WidgetRenderer({ widget }: { widget: WidgetFieldsFragment }) {
  if (widget.type === 'stat') return <StatWidget widget={widget} />;
  if (widget.type === 'chart') return <ChartWidget widget={widget} />;
  if (widget.type === 'compare') return <CompareWidget widget={widget} />;
  if (widget.type === 'gauge') return <GaugeWidget widget={widget} />;
  if (widget.type === 'alerts') return <AlertsWidget widget={widget} />;
  if (widget.type === 'table') return <TableWidget widget={widget} />;

  const meta = WIDGET_TYPES[widget.type];
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1.5 text-center text-muted-2">
      <LayoutDashboard className="size-5 opacity-60" />
      <span className="text-[11px] font-medium uppercase tracking-wide">
        {meta?.label ?? widget.type}
      </span>
      <span className="max-w-[90%] text-[11px] leading-snug">
        {meta?.description ?? 'Configure this widget'}
      </span>
    </div>
  );
}
