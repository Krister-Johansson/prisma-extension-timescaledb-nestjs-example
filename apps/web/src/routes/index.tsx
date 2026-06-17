import { createFileRoute } from '@tanstack/react-router';
import { Overview } from '@/components/overview/overview';

export const Route = createFileRoute('/')({
  staticData: {
    title: 'Overview',
    subtitle: 'Real-time status across all sensors',
    crumb: 'Overview',
  },
  component: Overview,
});
