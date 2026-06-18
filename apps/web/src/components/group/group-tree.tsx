import { useMutation, useQuery } from '@apollo/client/react';
import { FolderPlus } from 'lucide-react';
import { useState } from 'react';
import { QueryError } from '@/components/common/query-error';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { buildGroupTree, type GroupNode, subtreeIds } from '@/data/group-tree';
import {
  CreateSensorGroupDocument,
  DeleteSensorGroupDocument,
  MoveSensorGroupDocument,
  RenameSensorGroupDocument,
  SensorGroupsDocument,
} from '@/graphql/sensors.generated';
import { type GroupAction, GroupTreeNode } from './group-tree-node';

const ROOT = '__root__';
const refetch = { refetchQueries: ['SensorGroups', 'SensorsList'] };

export function GroupTree() {
  const { data, loading, error } = useQuery(SensorGroupsDocument, {
    context: { suppressErrorToast: true },
  });
  const [createGroup] = useMutation(CreateSensorGroupDocument, refetch);
  const [renameGroup] = useMutation(RenameSensorGroupDocument, refetch);
  const [moveGroup] = useMutation(MoveSensorGroupDocument, refetch);
  const [deleteGroup] = useMutation(DeleteSensorGroupDocument, refetch);

  // null node on a 'create' action = new root group.
  const [action, setAction] = useState<{
    kind: GroupAction;
    node: GroupNode | null;
  } | null>(null);
  const [nameValue, setNameValue] = useState('');
  const [moveTarget, setMoveTarget] = useState<string>(ROOT);

  const groups = data?.sensorGroups ?? [];
  const tree = buildGroupTree(groups);

  const open = (kind: GroupAction, node: GroupNode | null) => {
    setAction({ kind, node });
    setNameValue(kind === 'rename' ? (node?.name ?? '') : '');
    setMoveTarget(node?.parentId ?? ROOT);
  };
  const close = () => setAction(null);

  const submitName = async () => {
    const name = nameValue.trim();
    if (!name || !action) return;
    if (action.kind === 'rename' && action.node) {
      await renameGroup({ variables: { id: action.node.id, name } });
    } else {
      await createGroup({
        variables: { name, parentId: action.node?.id ?? null },
      });
    }
    close();
  };
  const submitMove = async () => {
    if (!action?.node) return;
    await moveGroup({
      variables: {
        id: action.node.id,
        parentId: moveTarget === ROOT ? null : moveTarget,
      },
    });
    close();
  };
  const submitDelete = async () => {
    if (!action?.node) return;
    await deleteGroup({ variables: { id: action.node.id } });
    close();
  };

  // Valid move targets: every group except the moving node's own subtree.
  const blocked = action?.node ? subtreeIds(action.node) : new Set<string>();
  const moveOptions = groups.filter((g) => !blocked.has(g.id));

  return (
    <div className="rounded-[14px] border border-border bg-card p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Groups</h3>
        <Button variant="outline" size="sm" onClick={() => open('create', null)}>
          <FolderPlus className="size-3.5" />
          New group
        </Button>
      </div>

      {loading && !data ? (
        <div className="flex flex-col gap-1.5">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-7 rounded-md" />
          ))}
        </div>
      ) : error ? (
        <QueryError message={error.message} />
      ) : tree.length === 0 ? (
        <div className="py-6 text-center text-[12.5px] text-muted-foreground">
          No groups yet — create one to organise your sensors (e.g. House → Upper
          floor → Bedroom).
        </div>
      ) : (
        <div>
          {tree.map((node) => (
            <GroupTreeNode key={node.id} node={node} onAction={open} />
          ))}
        </div>
      )}

      {/* Create / Rename */}
      <Dialog
        open={action?.kind === 'create' || action?.kind === 'rename'}
        onOpenChange={(o) => !o && close()}
      >
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle>
              {action?.kind === 'rename'
                ? `Rename “${action.node?.name}”`
                : action?.node
                  ? `New subgroup in “${action.node.name}”`
                  : 'New group'}
            </DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            placeholder="Group name"
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitName()}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button onClick={submitName} disabled={!nameValue.trim()}>
              {action?.kind === 'rename' ? 'Rename' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move */}
      <Dialog open={action?.kind === 'move'} onOpenChange={(o) => !o && close()}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle>Move “{action?.node?.name}”</DialogTitle>
          </DialogHeader>
          <Select value={moveTarget} onValueChange={setMoveTarget}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ROOT}>— Root (no parent) —</SelectItem>
              {moveOptions.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button onClick={submitMove}>Move</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <AlertDialog
        open={action?.kind === 'delete'}
        onOpenChange={(o) => !o && close()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{action?.node?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Its subgroups and sensors move up to its parent — nothing is
              deleted but this group.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={close}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={submitDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
