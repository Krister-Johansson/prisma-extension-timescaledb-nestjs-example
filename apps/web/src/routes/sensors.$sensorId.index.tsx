import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { useQuery } from '@apollo/client/react';
import { createFileRoute } from '@tanstack/react-router';
import { QueryError } from '@/components/common/query-error';
import { SensorNotFound } from '@/components/sensor/sensor-not-found';
import { chartSearchSchema } from '@/components/sensor-detail/chart-params';
import { SensorDetailSkeleton } from '@/components/sensor-detail/sensor-detail-skeleton';
import { SensorSummary } from '@/components/sensor-detail/sensor-summary';
import { SensorDetailDocument } from '@/graphql/sensors.generated';

export const Route = createFileRoute('/sensors/$sensorId/')({
  staticData: {
    title: 'Sensor detail',
    subtitle: 'Time-series, hourly aggregates & alerts',
    crumb: 'Sensor detail',
  },
  validateSearch: chartSearchSchema,
  component: SensorDetailRoute,
});

function SensorDetailRoute() {
  const { sensorId } = Route.useParams();
  // This route renders its own not-found / QueryError states, so skip the toast.
  const { data, loading, error } = useQuery(SensorDetailDocument, {
    variables: { id: sensorId },
    context: { suppressErrorToast: true },
  });

  if (loading && !data) return <SensorDetailSkeleton />;

  // A missing sensor surfaces as a NOT_FOUND GraphQL error (the API's global
  // filter); show the not-found state for that, but treat network/server errors
  // as real failures rather than masking them as "not found".
  if (error) {
    const isNotFound =
      CombinedGraphQLErrors.is(error) &&
      error.errors.some((e) => e.extensions?.code === 'NOT_FOUND');
    return isNotFound ? (
      <SensorNotFound sensorId={sensorId} />
    ) : (
      <QueryError message={error.message} />
    );
  }
  if (!data?.sensor) return <SensorNotFound sensorId={sensorId} />;
  return <SensorSummary sensor={data.sensor} />;
}
