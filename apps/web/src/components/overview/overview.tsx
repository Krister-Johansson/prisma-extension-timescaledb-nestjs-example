import { useQuery } from '@apollo/client/react';
import { QueryError } from '@/components/common/query-error';
import { toUiSensors } from '@/data/sensor-adapter';
import { SensorsListDocument } from '@/graphql/sensors.generated';
import { OverviewKpis } from './overview-kpis';
import { OverviewSensors } from './overview-sensors';
import { OverviewSkeleton } from './overview-skeleton';

export function Overview() {
  // This screen renders its own QueryError panel, so skip the global toast.
  const { data, loading, error } = useQuery(SensorsListDocument, {
    context: { suppressErrorToast: true },
  });

  if (loading && !data) return <OverviewSkeleton />;
  if (error) return <QueryError message={error.message} />;

  const sensors = toUiSensors(data);
  return (
    <>
      <OverviewKpis sensors={sensors} />
      <OverviewSensors sensors={sensors} />
    </>
  );
}
