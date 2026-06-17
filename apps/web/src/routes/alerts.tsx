import { createFileRoute } from '@tanstack/react-router';
import { Alerts } from '@/components/alerts/alerts';

export const Route = createFileRoute('/alerts')({
  staticData: {
    title: 'Alerts',
    subtitle: 'Active alerts and 24h event log',
    crumb: 'Alerts',
  },
  component: Alerts,
});
