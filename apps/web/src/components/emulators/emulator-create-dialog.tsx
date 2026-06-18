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
import { addEmulatorToCache } from '@/data/emulator-cache';
import { CreateEmulatorDocument } from '@/graphql/emulators.generated';
import { EmulatorForm, type SensorOption } from './emulator-form';

/** "New emulator" button + dialog. Owns the optimistic create mutation. */
export function EmulatorCreateDialog({ sensors }: { sensors: SensorOption[] }) {
  const [open, setOpen] = useState(false);
  const [createEmulator, { loading }] = useMutation(CreateEmulatorDocument);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="size-4" />
          New emulator
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New emulator</DialogTitle>
          <DialogDescription>
            Generate synthetic readings for a sensor on an interval. Values
            evolve naturally between min and max.
          </DialogDescription>
        </DialogHeader>
        <EmulatorForm
          key={open ? 'open' : 'closed'}
          sensors={sensors}
          pending={loading}
          onSubmit={(input) => {
            void createEmulator({
              variables: { input },
              optimisticResponse: {
                createEmulator: {
                  __typename: 'Emulator',
                  id: crypto.randomUUID(),
                  ...input,
                  running: true,
                  lastValue: null,
                },
              },
              update: (cache, { data }) => {
                if (data?.createEmulator)
                  addEmulatorToCache(cache, data.createEmulator);
              },
              onCompleted: () => {
                setOpen(false);
                toast.success('Emulator created');
              },
            }).catch(() => {});
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
