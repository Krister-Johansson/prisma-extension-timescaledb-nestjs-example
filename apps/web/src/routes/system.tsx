import { createFileRoute } from '@tanstack/react-router';
import { System } from '@/components/system/system';

export const Route = createFileRoute('/system')({
  staticData: {
    title: 'System',
    subtitle: 'Storage & ingestion metrics',
    crumb: 'System',
  },
  component: System,
});
