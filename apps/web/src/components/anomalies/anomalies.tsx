import { useQuery } from '@apollo/client/react';
import { QueryError } from '@/components/common/query-error';
import { Skeleton } from '@/components/ui/skeleton';
import { toUiSensors } from '@/data/sensor-adapter';
import { AllAnomaliesDocument } from '@/graphql/anomalies.generated';
import { SensorsListDocument } from '@/graphql/sensors.generated';
import { type AnomalyRow, TableAnomalyLog } from './table-anomaly-log';

export function Anomalies() {
  const { data: sensorsData } = useQuery(SensorsListDocument, {
    pollInterval: 10_000,
    context: { suppressErrorToast: true },
  });
  const { data, loading, error } = useQuery(AllAnomaliesDocument, {
    variables: { take: 100 },
    pollInterval: 10_000,
    context: { suppressErrorToast: true },
  });

  if (loading && !data) {
    return <Skeleton className="h-[420px] rounded-[14px]" />;
  }
  if (error) return <QueryError message={error.message} />;

  const sensorById = new Map(toUiSensors(sensorsData).map((s) => [s.id, s]));
  const rows: AnomalyRow[] = (data?.anomalies ?? []).map((a) => ({
    id: a.id,
    sensorId: a.sensorId,
    sensor: sensorById.get(a.sensorId)?.name ?? 'Unknown sensor',
    unit: sensorById.get(a.sensorId)?.unit ?? '',
    severity: a.severity,
    time: a.time,
    value: a.value,
    median: a.median,
    score: a.score,
    aiSummary: a.aiSummary,
  }));
  const critical = rows.filter((r) => r.severity === 'CRITICAL').length;

  return (
    <div className="flex flex-col gap-7">
      <section>
        <h2 className="mb-3.5 text-sm font-semibold">
          Detected anomalies · recent
          {rows.length > 0 ? ` · ${rows.length}` : ''}
          {critical > 0 && (
            <span className="ml-1.5 font-normal text-alert">
              {critical} critical
            </span>
          )}
        </h2>
        <TableAnomalyLog rows={rows} />
      </section>
    </div>
  );
}
