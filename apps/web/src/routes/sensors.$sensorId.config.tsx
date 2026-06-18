import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { useQuery } from '@apollo/client/react';
import { createFileRoute } from '@tanstack/react-router';
import { QueryError } from '@/components/common/query-error';
import { SensorNotFound } from '@/components/sensor/sensor-not-found';
import { SensorConfig } from '@/components/sensor-config/sensor-config';
import { SensorConfigSkeleton } from '@/components/sensor-config/sensor-config-skeleton';
import { SensorDetailDocument } from '@/graphql/sensors.generated';

export const Route = createFileRoute('/sensors/$sensorId/config')({
  staticData: {
    title: 'Sensor settings',
    subtitle: 'Sensor settings & alert rules',
    crumb: 'Settings',
  },
  component: SensorConfigRoute,
});

function SensorConfigRoute() {
  const { sensorId } = Route.useParams();
  // Identity for the header; the rule itself is loaded inside SensorConfig.
  const { data, loading, error } = useQuery(SensorDetailDocument, {
    variables: { id: sensorId },
    context: { suppressErrorToast: true },
  });

  if (loading && !data) return <SensorConfigSkeleton />;
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
  return <SensorConfig sensor={data.sensor} />;
}
