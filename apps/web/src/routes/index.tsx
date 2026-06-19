import { createFileRoute } from '@tanstack/react-router';
import { Dashboards } from '@/components/dashboard/dashboards';

export const Route = createFileRoute('/')({
  staticData: {
    title: 'Dashboards',
    subtitle: 'Your customizable views',
    crumb: 'Dashboards',
  },
  component: Dashboards,
});
