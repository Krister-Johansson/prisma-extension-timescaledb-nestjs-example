import { createFileRoute } from '@tanstack/react-router';
import { PagePlaceholder } from '@/components/layout/page-placeholder';

export const Route = createFileRoute('/system')({
  staticData: {
    title: 'System',
    subtitle: 'Storage & ingestion metrics',
    crumb: 'System',
  },
  component: () => <PagePlaceholder name="System" />,
});
