import { useQuery, useSubscription } from '@apollo/client/react';
import { useRef } from 'react';
import { toast } from 'sonner';
import { AlertFiredDocument } from '@/graphql/alert-events.generated';
import { SensorsListDocument } from '@/graphql/sensors.generated';

/**
 * App-wide listener for the `alertFired` subscription: toasts every raised /
 * cleared alert in real time. Sensor names come from the (cached) sensors
 * query, read through a ref so the subscription handler always sees the latest.
 */
export function AlertToaster() {
  const { data } = useQuery(SensorsListDocument, {
    fetchPolicy: 'cache-first',
    context: { suppressErrorToast: true },
  });

  const nameById = useRef(new Map<string, string>());
  nameById.current = new Map((data?.sensors ?? []).map((s) => [s.id, s.name]));

  useSubscription(AlertFiredDocument, {
    onData: ({ data: result }) => {
      const event = result.data?.alertFired;
      if (!event) return;
      const name = nameById.current.get(event.sensorId) ?? 'A sensor';

      if (event.kind === 'RAISED') {
        toast.error(`${name} — alert raised`, {
          id: event.id,
          description: `Reading ${event.value} crossed its threshold`,
        });
      } else {
        toast.success(`${name} — alert cleared`, {
          id: event.id,
          description: `Back within range at ${event.value}`,
        });
      }
    },
  });

  return null;
}
