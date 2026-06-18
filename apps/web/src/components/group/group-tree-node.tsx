import {
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { GroupNode } from '@/data/group-tree';

export type GroupAction = 'create' | 'rename' | 'move' | 'delete';

export function GroupTreeNode({
  node,
  onAction,
}: {
  node: GroupNode;
  onAction: (kind: GroupAction, node: GroupNode) => void;
}) {
  const [open, setOpen] = useState(true);
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <div
        className="group/row flex items-center gap-1.5 rounded-md py-1 pr-1.5 hover:bg-surface-2"
        style={{ paddingLeft: node.depth * 18 + 4 }}
      >
        {hasChildren ? (
          <button
            type="button"
            aria-label={open ? 'Collapse' : 'Expand'}
            onClick={() => setOpen((o) => !o)}
            className="flex size-5 items-center justify-center text-muted-2 hover:text-foreground"
          >
            {open ? (
              <ChevronDown className="size-3.5" />
            ) : (
              <ChevronRight className="size-3.5" />
            )}
          </button>
        ) : (
          <span className="size-5" />
        )}
        <span className="text-[13px] font-medium">{node.name}</span>
        <span className="font-mono text-[10.5px] text-muted-2">
          {node.sensorCount} {node.sensorCount === 1 ? 'sensor' : 'sensors'}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={`Actions for ${node.name}`}
              className="ml-auto opacity-0 focus-visible:opacity-100 group-hover/row:opacity-100 data-[state=open]:opacity-100"
            >
              <MoreHorizontal className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onAction('create', node)}>
              Add subgroup
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction('rename', node)}>
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction('move', node)}>
              Move to…
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={() => onAction('delete', node)}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {open && hasChildren && (
        <div>
          {node.children.map((child) => (
            <GroupTreeNode key={child.id} node={child} onAction={onAction} />
          ))}
        </div>
      )}
    </div>
  );
}
