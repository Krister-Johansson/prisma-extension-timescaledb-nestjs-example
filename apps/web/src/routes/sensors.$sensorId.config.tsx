import { createFileRoute } from '@tanstack/react-router';
import { PagePlaceholder } from '@/components/layout/page-placeholder';

export const Route = createFileRoute('/sensors/$sensorId/config')({
  staticData: {
    title: 'Sensor settings',
    subtitle: 'Sensor settings & alert rules',
    crumb: 'Settings',
  },
  component: () => <PagePlaceholder name="Sensor settings" />,
});
