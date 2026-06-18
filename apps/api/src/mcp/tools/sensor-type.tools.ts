import { Injectable } from '@nestjs/common';
import { Tool } from '@rekog/mcp-nest';
import { z } from 'zod';
import { SensorService } from '../../sensor/sensor.service';
import { jsonResult } from '../mcp-result';

const KEY = z
  .string()
  .regex(/^[A-Z0-9_]+$/, 'uppercase letters, digits or underscore')
  .max(40);

/** MCP tools for measurement-type CRUD. The unit lives on the type. */
@Injectable()
export class SensorTypeTools {
  constructor(private readonly sensors: SensorService) {}

  @Tool({
    name: 'list_sensor_types',
    description: 'List the measurement types (key, label, unit).',
    parameters: z.object({}),
    annotations: { readOnlyHint: true },
  })
  async list() {
    return jsonResult(await this.sensors.findTypes());
  }

  @Tool({
    name: 'create_sensor_type',
    description:
      'Create a measurement type so sensors can use it (e.g. key CO2, label CO₂, unit ppm).',
    parameters: z.object({
      key: KEY,
      label: z.string().min(1).max(60),
      unit: z.string().min(1).max(20),
    }),
  })
  async create({
    key,
    label,
    unit,
  }: {
    key: string;
    label: string;
    unit: string;
  }) {
    return jsonResult(await this.sensors.createType({ key, label, unit }));
  }

  @Tool({
    name: 'update_sensor_type',
    description: "Update a type's label and/or unit.",
    parameters: z.object({
      key: KEY,
      label: z.string().min(1).max(60).optional(),
      unit: z.string().min(1).max(20).optional(),
    }),
  })
  async update({
    key,
    label,
    unit,
  }: {
    key: string;
    label?: string;
    unit?: string;
  }) {
    return jsonResult(await this.sensors.updateType(key, { label, unit }));
  }

  @Tool({
    name: 'delete_sensor_type',
    description:
      'Delete a measurement type. Blocked while any sensor still uses it.',
    parameters: z.object({ key: KEY }),
    annotations: { destructiveHint: true },
  })
  async remove({ key }: { key: string }) {
    return jsonResult(await this.sensors.deleteType(key));
  }
}
