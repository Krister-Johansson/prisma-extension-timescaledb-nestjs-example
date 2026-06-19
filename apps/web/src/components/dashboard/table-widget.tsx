import { useQuery } from '@apollo/client/react';
import { useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { WidgetFieldsFragment } from '@/graphql/dashboards.generated';
import { TableSensorsDocument } from '@/graphql/widget-data.generated';
import { useCatalog } from './use-catalog';
import { parseTableConfig } from './widget-config';

const fmt = (n: number) => (Math.abs(n) >= 100 ? n.toFixed(0) : n.toFixed(1));

/** A list of latest values doesn't need sub-second freshness — poll slowly
 * rather than refetching on the live reading tick. */
const POLL_MS = 30_000;

export function TableWidget({ widget }: { widget: WidgetFieldsFragment }) {
  const cfg = parseTableConfig(widget.config);
  const catalog = useCatalog();
  const { data } = useQuery(TableSensorsDocument, {
    variables: { where: cfg.typeKey ? { typeKey: cfg.typeKey } : undefined },
    pollInterval: POLL_MS,
  });

  // Resolve the selected group's whole subtree (client-side, from the tree).
  const subtree = useMemo(() => {
    if (!cfg.groupId) return null;
    const childrenOf = new Map<string | null, string[]>();
    for (const g of catalog.groups) {
      const arr = childrenOf.get(g.parentId) ?? [];
      arr.push(g.id);
      childrenOf.set(g.parentId, arr);
    }
    const ids = new Set<string>();
    const stack = [cfg.groupId];
    while (stack.length) {
      const id = stack.pop() as string;
      ids.add(id);
      for (const child of childrenOf.get(id) ?? []) stack.push(child);
    }
    return ids;
  }, [cfg.groupId, catalog.groups]);

  const sensors = (data?.sensors ?? []).filter(
    (s) => !subtree || (s.groupId && subtree.has(s.groupId)),
  );

  if (sensors.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-[12px] text-muted-2">
        No matching sensors.
      </div>
    );
  }

  return (
    <Table className="text-[12px]">
      <TableHeader>
        <TableRow>
          <TableHead className="h-7">Sensor</TableHead>
          <TableHead className="h-7">Type</TableHead>
          <TableHead className="h-7 text-right">Latest</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sensors.map((s) => (
          <TableRow key={s.id}>
            <TableCell className="max-w-[140px] truncate py-1.5">
              {s.name}
            </TableCell>
            <TableCell className="py-1.5 text-muted-2">{s.type.label}</TableCell>
            <TableCell className="py-1.5 text-right tabular-nums">
              {s.latestReading
                ? `${fmt(s.latestReading.value)} ${s.type.unit}`
                : '—'}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
