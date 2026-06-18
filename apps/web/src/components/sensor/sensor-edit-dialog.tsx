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
  type: SensorType;
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
            Update the name or unit of “{sensor.name}”.
          </DialogDescription>
        </DialogHeader>
        <SensorForm
          key={open ? sensor.id : 'closed'}
          defaultValues={{ name: sensor.name, type: sensor.type, unit: sensor.unit }}
          submitLabel="Save changes"
          pending={loading}
          typeLocked
          onSubmit={({ name, unit }) => {
            void updateSensor({
              variables: { id: sensor.id, input: { name, unit } },
              optimisticResponse: {
                updateSensor: {
                  __typename: 'Sensor',
                  id: sensor.id,
                  name,
                  type: sensor.type,
                  unit,
                },
              },
              onCompleted: () => {
                onOpenChange(false);
                toast.success(`Sensor “${name}” updated`);
              },
              onError: (error) => toast.error(error.message),
            });
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
