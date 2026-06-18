import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PRISMA_CLIENT } from '../prisma/prisma-client';
import type { ExtendedPrismaClient } from '../prisma/prisma-client';

// A single advisory-lock key so all tree-structure mutations (move / delete-
// reparent) serialize — otherwise two concurrent cross-moves could each pass the
// cycle check and persist a cycle.
const TREE_LOCK_KEY = 815411;

@Injectable()
export class GroupService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: ExtendedPrismaClient,
  ) {}

  /** All groups (flat); the client builds the tree from `parentId`. */
  findMany() {
    return this.prisma.sensorGroup.findMany({ orderBy: { name: 'asc' } });
  }

  /** This group's id plus all of its descendants' ids. `UNION` (not `UNION ALL`)
   * makes the recursion terminate even if the data somehow contains a cycle. */
  async descendantIds(id: string): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      WITH RECURSIVE sub AS (
        SELECT id FROM "SensorGroup" WHERE id = ${id}
        UNION
        SELECT g.id FROM "SensorGroup" g JOIN sub ON g."parentId" = sub.id
      )
      SELECT id FROM sub
    `;
    return rows.map((r) => r.id);
  }

  /** Trim an optional id; treat empty/whitespace as "none" so a stray `""`
   * becomes a controlled null (root / ungrouped) rather than a DB FK error. */
  private normalizeId(id?: string | null): string | null {
    const trimmed = id?.trim();
    return trimmed ? trimmed : null;
  }

  private async requireGroup(id: string) {
    const group = await this.prisma.sensorGroup.findUnique({ where: { id } });
    if (!group) throw new NotFoundException(`Group ${id} not found`);
    return group;
  }

  async create(name: string, parentId?: string | null) {
    const pid = this.normalizeId(parentId);
    if (pid) await this.requireGroup(pid);
    return this.prisma.sensorGroup.create({ data: { name, parentId: pid } });
  }

  async rename(id: string, name: string) {
    await this.requireGroup(id);
    return this.prisma.sensorGroup.update({ where: { id }, data: { name } });
  }

  /** Move a group under a new parent (or to root). Cycle check + update run in
   * one transaction under an advisory lock, so concurrent moves can't race into
   * a cycle. */
  async move(id: string, parentId?: string | null) {
    const pid = this.normalizeId(parentId);
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${TREE_LOCK_KEY})`;

      const group = await tx.sensorGroup.findUnique({ where: { id } });
      if (!group) throw new NotFoundException(`Group ${id} not found`);

      if (pid) {
        const parent = await tx.sensorGroup.findUnique({ where: { id: pid } });
        if (!parent) throw new NotFoundException(`Group ${pid} not found`);

        const rows = await tx.$queryRaw<{ id: string }[]>`
          WITH RECURSIVE sub AS (
            SELECT id FROM "SensorGroup" WHERE id = ${id}
            UNION
            SELECT g.id FROM "SensorGroup" g JOIN sub ON g."parentId" = sub.id
          )
          SELECT id FROM sub
        `;
        if (rows.some((r) => r.id === pid)) {
          throw new BadRequestException(
            'Cannot move a group under itself or one of its descendants.',
          );
        }
      }

      return tx.sensorGroup.update({ where: { id }, data: { parentId: pid } });
    });
  }

  /** Delete a group, reparenting its children and sensors to its parent (or to
   * root / ungrouped if it was a root). Serialized with moves via the same lock
   * so a concurrent move can't strand a subtree. */
  async remove(id: string): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${TREE_LOCK_KEY})`;

      const group = await tx.sensorGroup.findUnique({ where: { id } });
      if (!group) throw new NotFoundException(`Group ${id} not found`);

      await tx.sensorGroup.updateMany({
        where: { parentId: id },
        data: { parentId: group.parentId },
      });
      await tx.sensor.updateMany({
        where: { groupId: id },
        data: { groupId: group.parentId },
      });
      await tx.sensorGroup.delete({ where: { id } });
      return true;
    });
  }

  /** Put a sensor into a group (or `null`/empty to ungroup it). */
  async assignSensor(sensorId: string, groupId?: string | null) {
    const gid = this.normalizeId(groupId);
    if (gid) await this.requireGroup(gid);
    return this.prisma.sensor.update({
      where: { id: sensorId },
      data: { groupId: gid },
    });
  }

  /** Direct sensor counts per group, batched. */
  async sensorCounts(groupIds: string[]): Promise<Map<string, number>> {
    const rows = await this.prisma.sensor.groupBy({
      by: ['groupId'],
      where: { groupId: { in: groupIds } },
      _count: { _all: true },
    });
    const counts = new Map<string, number>();
    for (const r of rows) {
      if (r.groupId) counts.set(r.groupId, r._count._all);
    }
    return counts;
  }
}
