import { Injectable } from '@nestjs/common';
import { Tool } from '@rekog/mcp-nest';
import { z } from 'zod';
import { GroupService } from '../../group/group.service';
import { jsonResult } from '../mcp-result';

/** MCP tools for the sensor group tree — thin wrappers over GroupService. */
@Injectable()
export class GroupTools {
  constructor(private readonly groups: GroupService) {}

  @Tool({
    name: 'list_groups',
    description:
      'List all groups (flat; build the tree from parentId) with each group’s direct sensor count.',
    parameters: z.object({}),
    annotations: { readOnlyHint: true },
  })
  async list() {
    const groups = await this.groups.findMany();
    const counts = await this.groups.sensorCounts(groups.map((g) => g.id));
    return jsonResult(
      groups.map((g) => ({ ...g, sensorCount: counts.get(g.id) ?? 0 })),
    );
  }

  @Tool({
    name: 'create_group',
    description: 'Create a group, optionally under a parent (omit for a root).',
    parameters: z.object({
      name: z.string().min(1),
      parentId: z.string().optional(),
    }),
  })
  async create({ name, parentId }: { name: string; parentId?: string }) {
    return jsonResult(await this.groups.create(name, parentId));
  }

  @Tool({
    name: 'rename_group',
    description: 'Rename a group.',
    parameters: z.object({ id: z.string(), name: z.string().min(1) }),
  })
  async rename({ id, name }: { id: string; name: string }) {
    return jsonResult(await this.groups.rename(id, name));
  }

  @Tool({
    name: 'move_group',
    description:
      'Move a group under a new parent (omit parentId for root). Rejects cycles.',
    parameters: z.object({ id: z.string(), parentId: z.string().optional() }),
  })
  async move({ id, parentId }: { id: string; parentId?: string }) {
    return jsonResult(await this.groups.move(id, parentId));
  }

  @Tool({
    name: 'delete_group',
    description:
      'Delete a group. Subgroups promote to its parent; its sensors become ungrouped.',
    parameters: z.object({ id: z.string() }),
    annotations: { destructiveHint: true },
  })
  async remove({ id }: { id: string }) {
    return jsonResult(await this.groups.remove(id));
  }

  @Tool({
    name: 'assign_sensor_to_group',
    description: 'Put a sensor into a group (omit groupId to ungroup it).',
    parameters: z.object({
      sensorId: z.string(),
      groupId: z.string().optional(),
    }),
  })
  async assign({ sensorId, groupId }: { sensorId: string; groupId?: string }) {
    return jsonResult(await this.groups.assignSensor(sensorId, groupId));
  }
}
