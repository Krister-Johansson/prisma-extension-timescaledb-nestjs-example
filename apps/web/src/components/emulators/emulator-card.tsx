import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { EmulatorsQuery } from '@/graphql/emulators.generated';
import { cn } from '@/lib/utils';
import { EmulatorDeleteDialog } from './emulator-delete-dialog';
import { EmulatorToggle } from './emulator-toggle';

type LiveEmulator = EmulatorsQuery['emulators'][number];

function formatInterval(seconds: number): string {
  return seconds >= 60 && seconds % 60 === 0
    ? `${seconds / 60} min`
    : `${seconds}s`;
}

export function EmulatorCard({
  emulator,
  sensorName,
  unit,
}: {
  emulator: LiveEmulator;
  sensorName: string;
  unit: string;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <div className="rounded-[12px] border border-border bg-card p-4 shadow-sm">
      <div className="mb-2.5 flex items-center justify-between gap-2.5">
        <span className="truncate text-sm font-semibold">{sensorName}</span>
        <span
          className={cn(
            'flex flex-none items-center gap-1.5 rounded-md px-2 py-0.5 font-mono text-[10px] font-semibold',
            emulator.running
              ? 'bg-ok-bg text-ok'
              : 'bg-surface-2 text-muted-foreground',
          )}
        >
          <span
            className={cn(
              'size-[6px] rounded-full',
              emulator.running ? 'animate-pulse bg-ok' : 'bg-muted-2',
            )}
          />
          {emulator.running ? 'RUNNING' : 'PAUSED'}
        </span>
      </div>
      <div className="font-mono text-[12px] text-muted-foreground">
        {emulator.min} – {emulator.max} {unit} · every{' '}
        {formatInterval(emulator.intervalSeconds)}
      </div>
      <div className="mt-1 font-mono text-[12px] text-muted-2">
        last:{' '}
        {emulator.lastValue === null ? '—' : `${emulator.lastValue} ${unit}`}
      </div>
      <div className="mt-3.5 flex gap-2 border-t border-border pt-3.5">
        <EmulatorToggle emulator={emulator} />
        <Button
          variant="outline"
          size="sm"
          className="ml-auto border-[color-mix(in_srgb,var(--alert)_35%,var(--border))] text-alert hover:text-alert"
          onClick={() => setDeleteOpen(true)}
        >
          Delete
        </Button>
      </div>

      <EmulatorDeleteDialog
        id={emulator.id}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </div>
  );
}
