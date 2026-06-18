import { useQuery } from '@apollo/client/react';
import { createFileRoute } from '@tanstack/react-router';
import { SensorNotFound } from '@/components/sensor/sensor-not-found';
import { SensorDetailSkeleton } from '@/components/sensor-detail/sensor-detail-skeleton';
import { SensorSummary } from '@/components/sensor-detail/sensor-summary';
import { SensorDetailDocument } from '@/graphql/sensors.generated';

export const Route = createFileRoute('/sensors/$sensorId/')({
  staticData: {
    title: 'Sensor detail',
    subtitle: 'Time-series, hourly aggregates & alerts',
    crumb: 'Sensor detail',
  },
  component: SensorDetailRoute,
});

function SensorDetailRoute() {
  const { sensorId } = Route.useParams();
  const { data, loading, error } = useQuery(SensorDetailDocument, {
    variables: { id: sensorId },
  });

  if (loading && !data) return <SensorDetailSkeleton />;
  if (error || !data?.sensor) return <SensorNotFound sensorId={sensorId} />;
  return <SensorSummary sensor={data.sensor} />;
}
