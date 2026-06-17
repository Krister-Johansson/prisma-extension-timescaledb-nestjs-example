import { createFileRoute } from '@tanstack/react-router';
import { PagePlaceholder } from '@/components/layout/page-placeholder';

export const Route = createFileRoute('/aggregates')({
  staticData: {
    title: 'Aggregates',
    subtitle: 'Hourly roll-ups across all sensors',
    crumb: 'Aggregates',
  },
  component: () => <PagePlaceholder name="Aggregates" />,
});
