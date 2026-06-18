import { useQuery } from '@apollo/client/react';
import { RelativeTime } from '@/components/common/relative-time';
import { Skeleton } from '@/components/ui/skeleton';
import { SensorAlertEventsDocument } from '@/graphql/alert-events.generated';
import { cn } from '@/lib/utils';

/** Recent raised/cleared alerts for a sensor (newest first), polled for live updates. */
export function DetailAlertHistory({
  sensorId,
  unit,
}: {
  sensorId: string;
  unit: string;
}) {
  const { data, loading } = useQuery(SensorAlertEventsDocument, {
    variables: { sensorId, take: 20 },
    pollInterval: 10_000,
    context: { suppressErrorToast: true },
  });
  const events = data?.alertEvents ?? [];

  return (
    <div className="rounded-[14px] border border-border bg-card p-5 shadow-sm">
      <h3 className="text-sm font-semibold">Alert history</h3>
      <div className="mb-3 mt-0.5 text-xs text-muted-foreground">
        Most recent alerts raised and cleared
      </div>

      {loading && !data ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-9 rounded-md" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="py-6 text-center text-[12.5px] text-muted-foreground">
          No alerts yet.
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {events.map((event) => {
            const raised = event.kind === 'RAISED';
            return (
              <li
                key={event.id}
                title={event.message}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className={cn(
                      'flex-none rounded-md px-2 py-0.5 font-mono text-[10px] font-semibold',
                      raised ? 'bg-alert-bg text-alert' : 'bg-ok-bg text-ok',
                    )}
                  >
                    {raised ? 'RAISED' : 'CLEARED'}
                  </span>
                  <span className="font-mono text-[12.5px] font-semibold">
                    {event.value} {unit}
                  </span>
                </div>
                <span className="flex-none font-mono text-[10.5px] text-muted-2">
                  <RelativeTime iso={event.createdAt} />
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
