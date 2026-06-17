import { createFileRoute } from '@tanstack/react-router';
import { PagePlaceholder } from '@/components/layout/page-placeholder';

export const Route = createFileRoute('/sensors/$sensorId')({
  staticData: {
    title: 'Sensor detail',
    subtitle: 'Time-series, hourly aggregates & alerts',
    crumb: 'Sensor detail',
  },
  component: () => <PagePlaceholder name="Sensor detail" />,
});
