import { createFileRoute } from '@tanstack/react-router';
import { Anomalies } from '@/components/anomalies/anomalies';

export const Route = createFileRoute('/anomalies')({
  staticData: {
    title: 'Anomalies',
    subtitle: 'Readings flagged by the detector',
    crumb: 'Anomalies',
  },
  component: Anomalies,
});
