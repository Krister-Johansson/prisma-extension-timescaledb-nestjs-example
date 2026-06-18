import { NotFoundException } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { Tool } from '@rekog/mcp-nest';
import { z } from 'zod';
import { SensorService } from '../../sensor/sensor.service';
import { jsonResult } from '../mcp-result';

/** MCP tools for sensor CRUD — thin wrappers over SensorService. */
@Injectable()
export class SensorTools {
  constructor(private readonly sensors: SensorService) {}

  @Tool({
    name: 'list_sensors',
    description:
      'List sensors, optionally filtered by measurement type key or a name substring.',
    parameters: z.object({
      typeKey: z
        .string()
        .optional()
        .describe('Measurement type key, e.g. CO2.'),
      nameContains: z.string().optional(),
    }),
    annotations: { readOnlyHint: true },
  })
  async list({
    typeKey,
    nameContains,
  }: {
    typeKey?: string;
    nameContains?: string;
  }) {
    return jsonResult(await this.sensors.findMany({ typeKey, nameContains }));
  }

  @Tool({
    name: 'get_sensor',
    description: 'Get a single sensor by id.',
    parameters: z.object({ id: z.string() }),
    annotations: { readOnlyHint: true },
  })
  async get({ id }: { id: string }) {
    const sensor = await this.sensors.findOne(id);
    if (!sensor) throw new NotFoundException(`Sensor ${id} not found`);
    return jsonResult(sensor);
  }

  @Tool({
    name: 'create_sensor',
    description:
      'Create a sensor. typeKey must be an existing measurement type (see list_sensor_types).',
    parameters: z.object({
      name: z.string().min(1),
      typeKey: z.string().regex(/^[A-Z0-9_]+$/),
    }),
  })
  async create({ name, typeKey }: { name: string; typeKey: string }) {
    return jsonResult(await this.sensors.create({ name, typeKey }));
  }

  @Tool({
    name: 'update_sensor',
    description: 'Rename a sensor (type is immutable).',
    parameters: z.object({ id: z.string(), name: z.string().min(1) }),
  })
  async update({ id, name }: { id: string; name: string }) {
    return jsonResult(await this.sensors.update(id, { name }));
  }

  @Tool({
    name: 'delete_sensor',
    description:
      'Delete a sensor (cascades to its readings, alert rule and events).',
    parameters: z.object({ id: z.string() }),
    annotations: { destructiveHint: true },
  })
  async remove({ id }: { id: string }) {
    return jsonResult(await this.sensors.remove(id));
  }
}
