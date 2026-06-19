import { MoreVertical, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { DashboardFieldsFragment } from '@/graphql/dashboards.generated';

export function DashboardTabs({
  dashboards,
  activeSlug,
  onSelect,
  onCreate,
  onRename,
  onDelete,
}: {
  dashboards: DashboardFieldsFragment[];
  activeSlug: string | null;
  onSelect: (slug: string) => void;
  onCreate: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto">
      {dashboards.map((d) => {
        const active = d.slug === activeSlug;
        return (
          <div
            key={d.id}
            className={`flex shrink-0 items-center border-b-2 ${
              active ? 'border-primary' : 'border-transparent'
            }`}
          >
            <button
              type="button"
              onClick={() => onSelect(d.slug)}
              className={`px-3 py-2 text-sm whitespace-nowrap ${
                active
                  ? 'font-semibold text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {d.name}
            </button>
            {active && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Dashboard actions"
                  >
                    <MoreVertical className="size-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={onRename}>Rename</DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={onDelete}
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        );
      })}
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="New dashboard"
        onClick={onCreate}
      >
        <Plus className="size-4" />
      </Button>
    </div>
  );
}
