import { useMutation } from '@apollo/client/react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { removeSensorFromCache } from '@/data/sensor-cache';
import { DeleteSensorDocument } from '@/graphql/sensors.generated';

/**
 * Controlled delete confirmation (opened from the row actions). Owns the
 * optimistic delete mutation — the sensor disappears from the list immediately
 * and reappears if the request fails.
 */
export function SensorDeleteDialog({
  sensor,
  open,
  onOpenChange,
}: {
  sensor: { id: string; name: string };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [deleteSensor, { loading }] = useMutation(DeleteSensorDocument);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete “{sensor.name}”?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes the sensor and all of its readings, alert
            rule and events. This can&apos;t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={loading}
            onClick={(e) => {
              e.preventDefault();
              void deleteSensor({
                variables: { id: sensor.id },
                optimisticResponse: {
                  deleteSensor: { __typename: 'Sensor', id: sensor.id },
                },
                update: (cache) => removeSensorFromCache(cache, sensor.id),
                onCompleted: () => {
                  onOpenChange(false);
                  toast.success(`Sensor “${sensor.name}” deleted`);
                },
                onError: (error) => toast.error(error.message),
              });
            }}
            className="bg-alert text-white hover:bg-alert/90"
          >
            {loading ? 'Deleting…' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
