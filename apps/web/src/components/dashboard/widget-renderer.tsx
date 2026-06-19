import { LayoutDashboard } from 'lucide-react';
import type { WidgetFieldsFragment } from '@/graphql/dashboards.generated';
import { WIDGET_TYPES } from './widget-meta';

/**
 * Maps a widget to its renderer. The real per-type renderers (chart, stat,
 * gauge, …) land in later phases; for now every widget shows a labeled
 * placeholder so the grid mechanics can be built and tested.
 */
export function WidgetRenderer({ widget }: { widget: WidgetFieldsFragment }) {
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
