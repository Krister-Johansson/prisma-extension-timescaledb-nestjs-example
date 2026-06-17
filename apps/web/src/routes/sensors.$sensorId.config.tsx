import { createFileRoute } from '@tanstack/react-router';
import { SensorNotFound } from '@/components/sensor/sensor-not-found';
import { SensorConfig } from '@/components/sensor-config/sensor-config';
import { sensorById } from '@/data/sensors';

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
  const sensor = sensorById(sensorId);
  if (!sensor) return <SensorNotFound sensorId={sensorId} />;
  return <SensorConfig sensor={sensor} />;
}
