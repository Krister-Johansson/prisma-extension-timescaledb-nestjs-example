import { createFileRoute } from '@tanstack/react-router';
import { PagePlaceholder } from '@/components/layout/page-placeholder';

export const Route = createFileRoute('/')({
  staticData: {
    title: 'Overview',
    subtitle: 'Real-time status across all sensors',
    crumb: 'Overview',
  },
  component: () => <PagePlaceholder name="Overview" />,
});
