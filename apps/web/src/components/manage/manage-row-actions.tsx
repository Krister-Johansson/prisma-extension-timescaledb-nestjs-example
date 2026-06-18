import { MoreHorizontal } from 'lucide-react';
import { useState } from 'react';
import { SensorDeleteDialog } from '@/components/sensor/sensor-delete-dialog';
import { SensorEditDialog } from '@/components/sensor/sensor-edit-dialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Sensor } from '@/data/types';
import { useGoTo } from '@/lib/navigation';
import { routes } from '@/lib/routes';

/**
 * Per-row action menu. The kebab/menu stop click propagation so they don't
 * trigger the row's navigate-to-detail. The edit/delete dialogs are controlled
 * siblings (each owns its mutation); the menu items just open them.
 */
export function ManageRowActions({ sensor }: { sensor: Sensor }) {
  const goTo = useGoTo();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label={`Actions for ${sensor.name}`}
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="min-w-44"
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            Edit sensor
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => goTo(routes.sensors.config(sensor.id))}
          >
            Manage alerts
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => setDeleteOpen(true)}
          >
            Delete sensor
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <SensorEditDialog
        sensor={sensor}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <SensorDeleteDialog
        sensor={sensor}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  );
}
