import { createFileRoute } from '@tanstack/react-router';
import { SensorNotFound } from '@/components/sensor/sensor-not-found';
import { SensorDetail } from '@/components/sensor-detail/sensor-detail';
import { sensorById } from '@/data/sensors';

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
  const sensor = sensorById(sensorId);
  if (!sensor) return <SensorNotFound sensorId={sensorId} />;
  return <SensorDetail sensor={sensor} />;
}
