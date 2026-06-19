import { useQuery } from '@apollo/client/react';
import { AllAlertEventsDocument } from '@/graphql/alert-events.generated';
import type { WidgetFieldsFragment } from '@/graphql/dashboards.generated';
import { useCatalog } from './use-catalog';
import { parseAlertsConfig } from './widget-config';

/** Recent alert events refresh on a slow poll; live alerts surface through the
 * app-wide AlertToaster, so the widget needn't chase every reading tick. */
const POLL_MS = 30_000;

const relTime = (iso: string) => {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.round(s / 60)}m`;
  if (s < 86400) return `${Math.round(s / 3600)}h`;
  return `${Math.round(s / 86400)}d`;
};

export function AlertsWidget({ widget }: { widget: WidgetFieldsFragment }) {
  const cfg = parseAlertsConfig(widget.config);
  const catalog = useCatalog();
  const { data } = useQuery(AllAlertEventsDocument, {
    variables: { take: cfg.limit },
    pollInterval: POLL_MS,
  });

  const events = data?.alertEvents ?? [];
  if (events.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-[12px] text-muted-2">
        No recent alerts ✅
      </div>
    );
  }

  return (
    <ul className="space-y-1.5 text-[12px]">
      {events.map((e) => (
        <li key={e.id} className="flex items-center gap-2">
          <span
            className={`size-2 shrink-0 rounded-full ${
              e.kind === 'RAISED' ? 'bg-alert' : 'bg-primary'
            }`}
          />
          <span className="truncate">
            {catalog.sensorById.get(e.sensorId)?.name ?? e.sensorId}
          </span>
          <span className="ml-auto shrink-0 tabular-nums text-muted-foreground">
            {e.value.toFixed(1)}
          </span>
          <span className="shrink-0 text-[10.5px] text-muted-2">
            {relTime(e.createdAt as string)}
          </span>
        </li>
      ))}
    </ul>
  );
}
