import { MoreHorizontal } from 'lucide-react';
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
 * trigger the row's navigate-to-detail. Mutating actions (pause/delete) are
 * placeholders until the data layer is wired.
 */
export function ManageRowActions({ sensor }: { sensor: Sensor }) {
  const goTo = useGoTo();
  return (
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
        <DropdownMenuItem
          onSelect={() => goTo(routes.sensors.config(sensor.id))}
        >
          Manage alerts
        </DropdownMenuItem>
        <DropdownMenuItem>
          {sensor.enabled ? 'Pause sensor' : 'Resume sensor'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">Delete sensor</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
