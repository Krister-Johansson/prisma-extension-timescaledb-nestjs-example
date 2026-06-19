import { LayoutDashboard } from 'lucide-react';
import type { WidgetFieldsFragment } from '@/graphql/dashboards.generated';
import { ChartWidget } from './chart-widget';
import { StatWidget } from './stat-widget';
import { WIDGET_TYPES } from './widget-meta';

/** Maps a widget to its renderer. Gauge/alerts/table land in later phases and
 * still show a labeled placeholder. */
export function WidgetRenderer({ widget }: { widget: WidgetFieldsFragment }) {
  if (widget.type === 'stat') return <StatWidget widget={widget} />;
  if (widget.type === 'chart') return <ChartWidget widget={widget} />;

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
