import { useQuery } from '@apollo/client/react';
import { QueryError } from '@/components/common/query-error';
import { Skeleton } from '@/components/ui/skeleton';
import { EmulatorsDocument } from '@/graphql/emulators.generated';
import { SensorsListDocument } from '@/graphql/sensors.generated';
import { EmulatorCard } from './emulator-card';
import { EmulatorCreateDialog } from './emulator-create-dialog';

export function Emulators() {
  // Poll so the live "last value" + running state stay fresh as the server
  // ticks. This screen renders its own error panel, so skip the global toast.
  const { data, loading, error } = useQuery(EmulatorsDocument, {
    pollInterval: 5000,
    context: { suppressErrorToast: true },
  });
  const { data: sensorData } = useQuery(SensorsListDocument, {
    context: { suppressErrorToast: true },
  });

  const emulators = data?.emulators ?? [];
  const sensors = (sensorData?.sensors ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    unit: s.type.unit,
  }));
  const sensorById = new Map(sensors.map((s) => [s.id, s]));

  if (loading && !data) {
    return (
      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[150px] rounded-[12px]" />
        ))}
      </div>
    );
  }
  if (error) return <QueryError message={error.message} />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Emulators · {emulators.length}</h2>
        {sensors.length > 0 ? <EmulatorCreateDialog sensors={sensors} /> : null}
      </div>

      {sensors.length === 0 ? (
        <div className="rounded-[12px] border border-dashed border-border p-11 text-center">
          <div className="text-sm font-semibold">No sensors yet</div>
          <div className="mt-1.5 text-[12.5px] text-muted-foreground">
            Create a sensor on the Manage page first, then add an emulator for
            it.
          </div>
        </div>
      ) : emulators.length === 0 ? (
        <div className="rounded-[12px] border border-dashed border-border p-11 text-center">
          <div className="text-sm font-semibold">No emulators yet</div>
          <div className="mt-1.5 text-[12.5px] text-muted-foreground">
            Add an emulator to start feeding a sensor synthetic readings.
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
          {emulators.map((emulator) => {
            const sensor = sensorById.get(emulator.sensorId);
            return (
              <EmulatorCard
                key={emulator.id}
                emulator={emulator}
                sensorName={sensor?.name ?? 'Unknown sensor'}
                unit={sensor?.unit ?? ''}
              />
            );
          })}
        </div>
      )}

      <p className="text-xs leading-relaxed text-muted-2">
        Each emulator ingests a reading on its interval, with values evolving as
        a bounded mean-reverting random walk between min and max — so the data
        looks natural and drives the same alert evaluation as real readings.
      </p>
    </div>
  );
}
