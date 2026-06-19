import { GripVertical, Settings2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WidgetFieldsFragment } from '@/graphql/dashboards.generated';
import { widgetTitle } from './widget-meta';
import { WidgetRenderer } from './widget-renderer';

/** The card around a widget: a header (drag grip + configure/remove when the
 * dashboard is unlocked) and the renderer body. */
export function WidgetFrame({
  widget,
  locked,
  onConfigure,
  onRemove,
}: {
  widget: WidgetFieldsFragment;
  locked: boolean;
  onConfigure: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[12px] border border-border bg-card">
      <div className="flex items-center justify-between gap-1 border-b border-border px-2 py-1">
        <div
          className={`flex min-w-0 items-center gap-1 text-[11px] font-medium text-muted-foreground ${
            locked ? '' : 'widget-grip cursor-grab active:cursor-grabbing'
          }`}
        >
          {!locked && <GripVertical className="size-3.5 shrink-0 text-muted-2" />}
          <span className="truncate">{widgetTitle(widget)}</span>
        </div>
        {!locked && (
          <div className="flex shrink-0 items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Configure widget"
              onClick={onConfigure}
            >
              <Settings2 className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Remove widget"
              onClick={onRemove}
            >
              <X className="size-3.5" />
            </Button>
          </div>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-2">
        <WidgetRenderer widget={widget} />
      </div>
    </div>
  );
}
