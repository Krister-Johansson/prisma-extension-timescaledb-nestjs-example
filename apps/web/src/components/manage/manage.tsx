import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SENSORS } from '@/data/sensors';
import { TableManage } from './table-manage';

export function Manage() {
  const sensors = SENSORS;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">All sensors · {sensors.length}</h2>
        {/* Add-sensor flow is wired in the data phase. */}
        <Button size="sm" className="gap-1.5">
          <Plus className="size-4" />
          Add sensor
        </Button>
      </div>

      <TableManage sensors={sensors} />

      <p className="text-xs leading-relaxed text-muted-2">
        Demo data: new sensors are generated with a synthetic 24h reading
        history. Rule changes re-evaluate alert state instantly. The last sensor
        can&apos;t be deleted.
      </p>
    </div>
  );
}
