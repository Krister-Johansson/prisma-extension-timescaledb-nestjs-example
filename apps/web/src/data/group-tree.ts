import type { SensorGroupsQuery } from '@/graphql/sensors.generated';

export type FlatGroup = SensorGroupsQuery['sensorGroups'][number];

export interface GroupNode extends FlatGroup {
  children: GroupNode[];
  depth: number;
}

/** Build the nested, name-sorted tree from the flat group list. */
export function buildGroupTree(groups: FlatGroup[]): GroupNode[] {
  const byId = new Map<string, GroupNode>();
  for (const g of groups) byId.set(g.id, { ...g, children: [], depth: 0 });

  const roots: GroupNode[] = [];
  for (const node of byId.values()) {
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  const walk = (nodes: GroupNode[], depth: number) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    for (const n of nodes) {
      n.depth = depth;
      walk(n.children, depth + 1);
    }
  };
  walk(roots, 0);
  return roots;
}

/** Flatten a node and all its descendants into a Set of ids (for move guards). */
export function subtreeIds(node: GroupNode, acc = new Set<string>()): Set<string> {
  acc.add(node.id);
  for (const c of node.children) subtreeIds(c, acc);
  return acc;
}
