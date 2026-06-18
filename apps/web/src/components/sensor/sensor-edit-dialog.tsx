import { useMutation } from '@apollo/client/react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { UpdateSensorDocument } from '@/graphql/sensors.generated';
import type { SensorType } from '@/data/types';
import { SensorForm } from './sensor-form';

type EditableSensor = {
  id: string;
  name: string;
  /** Type key. */
  type: SensorType;
  typeLabel: string;
  unit: string;
};

/**
 * Controlled edit dialog (opened from the row actions). Owns the optimistic
 * update mutation; only `name`/`unit` are sent since `type` is immutable.
 */
export function SensorEditDialog({
  sensor,
  open,
  onOpenChange,
}: {
  sensor: EditableSensor;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [updateSensor, { loading }] = useMutation(UpdateSensorDocument);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit sensor</DialogTitle>
          <DialogDescription>
            Update the name of “{sensor.name}”.
          </DialogDescription>
        </DialogHeader>
        <SensorForm
          key={open ? sensor.id : 'closed'}
          defaultValues={{ name: sensor.name, typeKey: sensor.type }}
          submitLabel="Save changes"
          pending={loading}
          typeLocked
          onSubmit={({ name }) => {
            updateSensor({
              variables: { id: sensor.id, input: { name } },
              optimisticResponse: {
                updateSensor: {
                  __typename: 'Sensor',
                  id: sensor.id,
                  name,
                  type: {
                    key: sensor.type,
                    label: sensor.typeLabel,
                    unit: sensor.unit,
                  },
                },
              },
              onCompleted: () => {
                onOpenChange(false);
                toast.success(`Sensor “${name}” updated`);
              },
              // Errors are surfaced globally by the Apollo ErrorLink; swallow
              // the rejection so it isn't unhandled (dialog stays open to retry).
            }).catch(() => {});
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
