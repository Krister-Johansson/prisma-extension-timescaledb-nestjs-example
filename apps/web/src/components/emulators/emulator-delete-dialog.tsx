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
import { removeEmulatorFromCache } from '@/data/emulator-cache';
import { DeleteEmulatorDocument } from '@/graphql/emulators.generated';

/** Controlled delete confirmation for an emulator. Optimistic. */
export function EmulatorDeleteDialog({
  id,
  open,
  onOpenChange,
}: {
  id: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [deleteEmulator, { loading }] = useMutation(DeleteEmulatorDocument);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this emulator?</AlertDialogTitle>
          <AlertDialogDescription>
            It stops generating readings for its sensor. Existing readings are
            kept. This can&apos;t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={loading}
            onClick={(e) => {
              e.preventDefault();
              void deleteEmulator({
                variables: { id },
                optimisticResponse: {
                  deleteEmulator: { __typename: 'Emulator', id },
                },
                update: (cache) => removeEmulatorFromCache(cache, id),
                onCompleted: () => {
                  onOpenChange(false);
                  toast.success('Emulator deleted');
                },
              }).catch(() => {});
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
