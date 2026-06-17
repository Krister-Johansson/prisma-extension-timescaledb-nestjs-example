import { useQuery } from '@apollo/client/react';
import { QueryError } from '@/components/common/query-error';
import { toUiSensors } from '@/data/sensor-adapter';
import { SensorsListDocument } from '@/graphql/sensors.generated';
import { OverviewKpis } from './overview-kpis';
import { OverviewSensors } from './overview-sensors';
import { OverviewSkeleton } from './overview-skeleton';

export function Overview() {
  const { data, loading, error } = useQuery(SensorsListDocument);

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
