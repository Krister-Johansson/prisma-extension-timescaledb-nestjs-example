import { createFileRoute } from '@tanstack/react-router';
import { Emulators } from '@/components/emulators/emulators';

export const Route = createFileRoute('/emulators')({
  staticData: {
    title: 'Emulators',
    subtitle: 'Generate synthetic sensor data',
    crumb: 'Emulators',
  },
  component: Emulators,
});
