import { useMutation, useQuery } from '@apollo/client/react';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { addSensorToCache } from '@/data/sensor-cache';
import {
  CreateSensorDocument,
  SensorTypesDocument,
} from '@/graphql/sensors.generated';
import { SensorForm } from './sensor-form';

/** "Add sensor" button + dialog. Owns the optimistic create mutation. */
export function SensorCreateDialog() {
  const [open, setOpen] = useState(false);
  const [createSensor, { loading }] = useMutation(CreateSensorDocument);
  const { data: typesData } = useQuery(SensorTypesDocument, {
    context: { suppressErrorToast: true },
  });
  const types = typesData?.sensorTypes ?? [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="size-4" />
          Add sensor
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add sensor</DialogTitle>
          <DialogDescription>
            Create a sensor to start ingesting readings.
          </DialogDescription>
        </DialogHeader>
        {/* Remount per open so the form resets to its defaults. */}
        <SensorForm
          key={open ? 'open' : 'closed'}
          defaultValues={{ name: '', typeKey: types[0]?.key ?? 'TEMPERATURE' }}
          submitLabel="Create sensor"
          pending={loading}
          onSubmit={(input) => {
            const type = types.find((t) => t.key === input.typeKey);
            createSensor({
              variables: { input },
              optimisticResponse: {
                createSensor: {
                  __typename: 'Sensor',
                  id: crypto.randomUUID(),
                  name: input.name,
                  type: {
                    key: input.typeKey,
                    label: type?.label ?? input.typeKey,
                    unit: type?.unit ?? '',
                  },
                  groupId: null,
                  readings: [],
                  rules: [],
                },
              },
              update: (cache, { data }) => {
                if (data?.createSensor) addSensorToCache(cache, data.createSensor);
              },
              onCompleted: () => {
                setOpen(false);
                toast.success(`Sensor “${input.name}” created`);
              },
              // Errors are surfaced globally by the Apollo ErrorLink (toast +
              // log); swallow the rejection here so it isn't unhandled. The
              // dialog stays open (onCompleted didn't run) so the user can retry.
            }).catch(() => {});
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
