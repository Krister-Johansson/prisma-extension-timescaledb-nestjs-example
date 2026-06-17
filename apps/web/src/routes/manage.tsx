import { createFileRoute } from '@tanstack/react-router';
import { PagePlaceholder } from '@/components/layout/page-placeholder';

export const Route = createFileRoute('/manage')({
  staticData: {
    title: 'Manage sensors',
    subtitle: 'Create sensors and configure alert rules',
    crumb: 'Manage sensors',
  },
  component: () => <PagePlaceholder name="Manage sensors" />,
});
