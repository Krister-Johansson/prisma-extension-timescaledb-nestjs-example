import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PRISMA_CLIENT } from '../prisma/prisma-client';
import type { ExtendedPrismaClient } from '../prisma/prisma-client';

@Injectable()
export class GroupService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: ExtendedPrismaClient,
  ) {}

  /** All groups (flat); the client builds the tree from `parentId`. */
  findMany() {
    return this.prisma.sensorGroup.findMany({ orderBy: { name: 'asc' } });
  }

  /** This group's id plus all of its descendants' ids (recursive CTE). */
  async descendantIds(id: string): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      WITH RECURSIVE sub AS (
        SELECT id FROM "SensorGroup" WHERE id = ${id}
        UNION ALL
        SELECT g.id FROM "SensorGroup" g JOIN sub ON g."parentId" = sub.id
      )
      SELECT id FROM sub
    `;
    return rows.map((r) => r.id);
  }

  private async requireGroup(id: string) {
    const group = await this.prisma.sensorGroup.findUnique({ where: { id } });
    if (!group) throw new NotFoundException(`Group ${id} not found`);
    return group;
  }

  async create(name: string, parentId?: string | null) {
    if (parentId) await this.requireGroup(parentId);
    return this.prisma.sensorGroup.create({
      data: { name, parentId: parentId ?? null },
    });
  }

  async rename(id: string, name: string) {
    await this.requireGroup(id);
    return this.prisma.sensorGroup.update({ where: { id }, data: { name } });
  }

  /** Move a group under a new parent (or to root). Rejects cycles. */
  async move(id: string, parentId?: string | null) {
    await this.requireGroup(id);
    if (parentId) {
      await this.requireGroup(parentId);
      const descendants = await this.descendantIds(id); // includes self
      if (descendants.includes(parentId)) {
        throw new BadRequestException(
          'Cannot move a group under itself or one of its descendants.',
        );
      }
    }
    return this.prisma.sensorGroup.update({
      where: { id },
      data: { parentId: parentId ?? null },
    });
  }

  /** Delete a group, reparenting its children and sensors to its parent (or to
   * root / ungrouped if it was a root). No subtree or sensor is lost. */
  async remove(id: string): Promise<boolean> {
    const group = await this.requireGroup(id);
    await this.prisma.$transaction([
      this.prisma.sensorGroup.updateMany({
        where: { parentId: id },
        data: { parentId: group.parentId },
      }),
      this.prisma.sensor.updateMany({
        where: { groupId: id },
        data: { groupId: group.parentId },
      }),
      this.prisma.sensorGroup.delete({ where: { id } }),
    ]);
    return true;
  }

  /** Put a sensor into a group (or `null` to ungroup it). */
  async assignSensor(sensorId: string, groupId?: string | null) {
    if (groupId) await this.requireGroup(groupId);
    return this.prisma.sensor.update({
      where: { id: sensorId },
      data: { groupId: groupId ?? null },
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
