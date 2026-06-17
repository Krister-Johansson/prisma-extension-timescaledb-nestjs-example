import { createFileRoute } from '@tanstack/react-router';
import { PagePlaceholder } from '@/components/layout/page-placeholder';

export const Route = createFileRoute('/alerts')({
  staticData: {
    title: 'Alerts',
    subtitle: 'Active alerts and 24h event log',
    crumb: 'Alerts',
  },
  component: () => <PagePlaceholder name="Alerts" />,
});
