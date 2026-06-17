import { createFileRoute } from '@tanstack/react-router';
import { Aggregates } from '@/components/aggregates/aggregates';

export const Route = createFileRoute('/aggregates')({
  staticData: {
    title: 'Aggregates',
    subtitle: 'Hourly roll-ups across all sensors',
    crumb: 'Aggregates',
  },
  component: Aggregates,
});
