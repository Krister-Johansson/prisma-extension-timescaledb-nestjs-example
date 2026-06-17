import { useState } from 'react';
import { CardSensor } from '@/components/sensor/card-sensor';
import { TableSensor } from '@/components/sensor/table-sensor';
import type { Sensor } from '@/data/types';
import { cn } from '@/lib/utils';

type View = 'cards' | 'table';

export function OverviewSensors({ sensors }: { sensors: Sensor[] }) {
  const [view, setView] = useState<View>('cards');

  return (
    <section>
      <div className="mb-3.5 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Sensors</h2>
        <div className="inline-flex rounded-lg border border-border bg-card p-0.5">
          {(['cards', 'table'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setView(option)}
              className={cn(
                'rounded-md px-3 py-1 text-[12.5px] font-medium capitalize transition-colors',
                view === option
                  ? 'bg-surface-2 text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {view === 'cards' ? (
        <CardSensor sensors={sensors} />
      ) : (
        <TableSensor sensors={sensors} />
      )}
    </section>
  );
}
