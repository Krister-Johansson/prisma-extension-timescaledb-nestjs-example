import { useQuery } from '@apollo/client/react';
import { QueryError } from '@/components/common/query-error';
import { Skeleton } from '@/components/ui/skeleton';
import { toUiSensors } from '@/data/sensor-adapter';
import { AllAlertEventsDocument } from '@/graphql/alert-events.generated';
import { SensorsListDocument } from '@/graphql/sensors.generated';
import { AlertActiveGrid } from './alert-active-grid';
import { type EventRow, TableEventLog } from './table-event-log';

export function Alerts() {
  const { data, loading, error } = useQuery(SensorsListDocument, {
    pollInterval: 5000,
    context: { suppressErrorToast: true },
  });
  const {
    data: eventsData,
    loading: eventsLoading,
    error: eventsError,
  } = useQuery(AllAlertEventsDocument, {
    variables: { take: 50 },
    pollInterval: 5000,
    context: { suppressErrorToast: true },
  });

  if (loading && !data) {
    return (
      <div className="flex flex-col gap-7">
        <Skeleton className="h-[180px] rounded-[14px]" />
        <Skeleton className="h-[280px] rounded-[14px]" />
      </div>
    );
  }
  if (error) return <QueryError message={error.message} />;

  const sensors = toUiSensors(data);
  const sensorById = new Map(sensors.map((s) => [s.id, s]));
  const active = sensors.filter((s) => s.status === 'ALERTING');
  const events = eventsData?.alertEvents ?? [];

  // Newest RAISED per sensor (events come newest-first).
  const raisedAtById = new Map<string, string>();
  for (const e of events) {
    if (e.kind === 'RAISED' && !raisedAtById.has(e.sensorId)) {
      raisedAtById.set(e.sensorId, e.createdAt);
    }
  }

  const rows: EventRow[] = events.map((e) => ({
    id: e.id,
    sensor: sensorById.get(e.sensorId)?.name ?? 'Unknown sensor',
    unit: sensorById.get(e.sensorId)?.unit ?? '',
    kind: e.kind,
    value: e.value,
    createdAt: e.createdAt,
  }));

  return (
    <div className="flex flex-col gap-7">
      <section>
        <h2 className="mb-3.5 text-sm font-semibold">
          Active alerts{active.length > 0 ? ` · ${active.length}` : ''}
        </h2>
        <AlertActiveGrid sensors={active} raisedAtById={raisedAtById} />
      </section>
      <section>
        <h2 className="mb-3.5 text-sm font-semibold">Event log · recent</h2>
        {eventsLoading && !eventsData ? (
          <Skeleton className="h-[280px] rounded-[14px]" />
        ) : eventsError ? (
          <QueryError message={eventsError.message} />
        ) : (
          <TableEventLog rows={rows} />
        )}
      </section>
    </div>
  );
}
