import { Injectable } from '@nestjs/common';
import { Tool } from '@rekog/mcp-nest';
import { z } from 'zod';
import { EmulatorService } from '../../emulator/emulator.service';
import { jsonResult } from '../mcp-result';

const interval = z.number().int().min(1).max(3600);

/** MCP tools for the data emulators — thin wrappers over EmulatorService. An
 * emulator ingests a value in [min, max] for its sensor every intervalSeconds
 * while running. (Reads are emulated; there is no manual ingestion tool.) */
@Injectable()
export class EmulatorTools {
  constructor(private readonly emulators: EmulatorService) {}

  @Tool({
    name: 'list_emulators',
    description: 'List the data emulators (newest first).',
    parameters: z.object({}),
    annotations: { readOnlyHint: true },
  })
  async list() {
    return jsonResult(await this.emulators.list());
  }

  @Tool({
    name: 'create_emulator',
    description:
      'Create an emulator for a sensor: ingests a value in [min, max] every intervalSeconds (1–3600).',
    parameters: z.object({
      sensorId: z.string(),
      min: z.number(),
      max: z.number(),
      intervalSeconds: interval,
    }),
  })
  async create(input: {
    sensorId: string;
    min: number;
    max: number;
    intervalSeconds: number;
  }) {
    return jsonResult(await this.emulators.create(input));
  }

  @Tool({
    name: 'update_emulator',
    description: 'Update an emulator’s value band and/or cadence.',
    parameters: z.object({
      id: z.string(),
      min: z.number().optional(),
      max: z.number().optional(),
      intervalSeconds: interval.optional(),
    }),
  })
  async update({
    id,
    ...data
  }: {
    id: string;
    min?: number;
    max?: number;
    intervalSeconds?: number;
  }) {
    return jsonResult(await this.emulators.update(id, data));
  }

  @Tool({
    name: 'set_emulator_running',
    description: 'Start or pause an emulator.',
    parameters: z.object({ id: z.string(), running: z.boolean() }),
  })
  async setRunning({ id, running }: { id: string; running: boolean }) {
    return jsonResult(await this.emulators.setRunning(id, running));
  }

  @Tool({
    name: 'delete_emulator',
    description: 'Delete an emulator by id.',
    parameters: z.object({ id: z.string() }),
    annotations: { destructiveHint: true },
  })
  async remove({ id }: { id: string }) {
    return jsonResult(await this.emulators.remove(id));
  }
}
