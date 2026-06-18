import { useMutation } from '@apollo/client/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { SetEmulatorRunningDocument } from '@/graphql/emulators.generated';

/** Pause/resume an emulator (optimistic). */
export function EmulatorToggle({
  emulator,
}: {
  emulator: { id: string; running: boolean };
}) {
  const [setRunning, { loading }] = useMutation(SetEmulatorRunningDocument);
  const next = !emulator.running;

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={loading}
      onClick={() => {
        void setRunning({
          variables: { id: emulator.id, running: next },
          optimisticResponse: {
            setEmulatorRunning: {
              __typename: 'Emulator',
              id: emulator.id,
              running: next,
            },
          },
          onCompleted: () =>
            toast.success(next ? 'Emulator resumed' : 'Emulator paused'),
        }).catch(() => {});
      }}
    >
      {emulator.running ? 'Pause' : 'Resume'}
    </Button>
  );
}
