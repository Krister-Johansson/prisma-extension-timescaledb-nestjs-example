import { createFileRoute } from '@tanstack/react-router';
import { Manage } from '@/components/manage/manage';

export const Route = createFileRoute('/manage')({
  staticData: {
    title: 'Manage sensors',
    subtitle: 'Create sensors and configure alert rules',
    crumb: 'Manage',
  },
  component: Manage,
});
