import { Injectable } from '@nestjs/common';
import { Tool } from '@rekog/mcp-nest';
import { z } from 'zod';
import { AlertService } from '../../alert/alert.service';
import { jsonResult } from '../mcp-result';

const direction = z.enum(['ABOVE', 'BELOW']);

/** MCP tools for alert rules — thin wrappers over AlertService. The clear
 * threshold is a hysteresis reset band (must sit on the resetting side). */
@Injectable()
export class AlertTools {
  constructor(private readonly alerts: AlertService) {}

  @Tool({
    name: 'list_alert_rules',
    description:
      'List alert rules — all of them, or just one sensor’s if sensorId is given.',
    parameters: z.object({ sensorId: z.string().optional() }),
    annotations: { readOnlyHint: true },
  })
  async list({ sensorId }: { sensorId?: string }) {
    return jsonResult(
      sensorId
        ? await this.alerts.rulesFor(sensorId)
        : await this.alerts.allRules(),
    );
  }

  @Tool({
    name: 'create_alert_rule',
    description:
      'Create an alert rule. ABOVE fires when value ≥ threshold (clear ≤ clearThreshold), BELOW is the mirror.',
    parameters: z.object({
      sensorId: z.string(),
      direction,
      threshold: z.number(),
      clearThreshold: z.number(),
      severity: z.string().default('WARNING'),
      enabled: z.boolean().default(true),
    }),
  })
  async create(input: {
    sensorId: string;
    direction: 'ABOVE' | 'BELOW';
    threshold: number;
    clearThreshold: number;
    severity: string;
    enabled: boolean;
  }) {
    return jsonResult(await this.alerts.createRule(input));
  }

  @Tool({
    name: 'update_alert_rule',
    description: "Replace a rule's fields (keyed by id).",
    parameters: z.object({
      id: z.string(),
      direction,
      threshold: z.number(),
      clearThreshold: z.number(),
      severity: z.string(),
      enabled: z.boolean(),
    }),
  })
  async update({
    id,
    ...input
  }: {
    id: string;
    direction: 'ABOVE' | 'BELOW';
    threshold: number;
    clearThreshold: number;
    severity: string;
    enabled: boolean;
  }) {
    return jsonResult(await this.alerts.updateRule(id, input));
  }

  @Tool({
    name: 'delete_alert_rule',
    description: 'Delete an alert rule by id.',
    parameters: z.object({ id: z.string() }),
    annotations: { destructiveHint: true },
  })
  async remove({ id }: { id: string }) {
    return jsonResult(await this.alerts.removeRule(id));
  }
}
