import { useMutation } from '@apollo/client/react';
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
import { CreateSensorDocument } from '@/graphql/sensors.generated';
import { SensorForm } from './sensor-form';

/** "Add sensor" button + dialog. Owns the optimistic create mutation. */
export function SensorCreateDialog() {
  const [open, setOpen] = useState(false);
  const [createSensor, { loading }] = useMutation(CreateSensorDocument);

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
          defaultValues={{ name: '', type: 'TEMPERATURE', unit: '°C' }}
          submitLabel="Create sensor"
          pending={loading}
          onSubmit={(input) => {
            void createSensor({
              variables: { input },
              optimisticResponse: {
                createSensor: {
                  __typename: 'Sensor',
                  id: crypto.randomUUID(),
                  ...input,
                  readings: [],
                },
              },
              update: (cache, { data }) => {
                if (data?.createSensor) addSensorToCache(cache, data.createSensor);
              },
              onCompleted: () => {
                setOpen(false);
                toast.success(`Sensor “${input.name}” created`);
              },
              onError: (error) => toast.error(error.message),
            });
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
