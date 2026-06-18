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

/** Depth-first flatten of the tree (parents before children) — for an indented
 * dropdown that preserves hierarchy. */
export function flattenTree(
  nodes: GroupNode[],
  acc: GroupNode[] = [],
): GroupNode[] {
  for (const n of nodes) {
    acc.push(n);
    flattenTree(n.children, acc);
  }
  return acc;
}

/** `rootId` plus all of its descendant group ids, from the flat list — for
 * "sensors under this group" filtering. */
export function subtreeGroupIds(
  groups: FlatGroup[],
  rootId: string,
): Set<string> {
  const childrenByParent = new Map<string, string[]>();
  for (const g of groups) {
    if (!g.parentId) continue;
    const siblings = childrenByParent.get(g.parentId);
    if (siblings) siblings.push(g.id);
    else childrenByParent.set(g.parentId, [g.id]);
  }
  const ids = new Set<string>([rootId]);
  const stack = [rootId];
  while (stack.length) {
    const id = stack.pop() as string;
    for (const child of childrenByParent.get(id) ?? []) {
      if (!ids.has(child)) {
        ids.add(child);
        stack.push(child);
      }
    }
  }
  return ids;
}
