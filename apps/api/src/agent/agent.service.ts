import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import { AlertService } from '../alert/alert.service';
import { GroupService } from '../group/group.service';
import { PRISMA_CLIENT } from '../prisma/prisma-client';
import type { ExtendedPrismaClient } from '../prisma/prisma-client';
import { ReadingService } from '../reading/reading.service';
import { SensorService } from '../sensor/sensor.service';
import { HypertableModel } from '../timescale-admin/models/hypertable-stats.model';
import { TimescaleAdminService } from '../timescale-admin/timescale-admin.service';
import { loadAi, type ChatParams, type TanstackAi } from './ai-runtime';
import { buildSystemPrompt, type Catalog } from './agent.system-prompt';

/** Permissive output schema — keeps every key the tool returns (a strict
 * `z.object` would strip them, gutting the result the model sees). */
const anyObject = z.record(z.string(), z.any());
const AGG = z.enum(['AVG', 'MIN', 'MAX']);

/**
 * The AI chat agent. Runs the model loop server-side (key stays here), exposing
 * read-only tools that wrap the existing services. Returns an SSE Response the
 * controller pipes to the client.
 */
@Injectable()
export class AgentService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: ExtendedPrismaClient,
    private readonly sensors: SensorService,
    private readonly groups: GroupService,
    private readonly readings: ReadingService,
    private readonly alerts: AlertService,
    private readonly admin: TimescaleAdminService,
    private readonly config: ConfigService,
  ) {}

  get enabled(): boolean {
    return Boolean(this.config.get<string>('OPENROUTER_API_KEY'));
  }

  /** Validate the client-sent timezone (an IANA name) before it's interpolated
   * into the prompt / used for formatting; fall back to UTC on anything bogus. */
  private safeTimezone(tz: unknown): string {
    if (typeof tz !== 'string') return 'UTC';
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: tz });
      return tz;
    } catch {
      return 'UTC';
    }
  }

  /** Run a chat turn and return the AG-UI SSE Response. */
  async chat(body: unknown): Promise<Response> {
    const { ai, or } = await loadAi();
    const params: ChatParams = await ai.chatParamsFromRequestBody(body);
    const timezone = this.safeTimezone(params.forwardedProps?.timezone);

    const catalog = await this.catalog();
    const model = this.config.get<string>(
      'OPENROUTER_MODEL',
      'anthropic/claude-opus-4.8',
    );

    const stream = ai.chat({
      adapter: or.openRouterText(model),
      systemPrompts: [buildSystemPrompt({ timezone, catalog })],
      messages: params.messages,
      tools: this.buildTools(ai, timezone),
      // Adaptive thinking on Opus; harmless on models that ignore it.
      modelOptions: { reasoning: { enabled: true } },
    });

    return ai.toServerSentEventsResponse(stream);
  }

  // ---- tools ----------------------------------------------------------------

  private buildTools(ai: TanstackAi, timezone: string): unknown[] {
    const def = ai.toolDefinition;
    const tool = (
      name: string,
      description: string,
      inputSchema: z.ZodTypeAny,
      fn: (input: never) => unknown,
    ) =>
      def({ name, description, inputSchema, outputSchema: anyObject }).server(
        fn,
      );

    return [
      tool(
        'get_current_time',
        "The current date/time in the user's timezone. Call this first when a question uses relative times (now, last night, today, last week).",
        z.object({}),
        () => {
          const now = new Date();
          return {
            iso: now.toISOString(),
            timezone,
            localTime: now.toLocaleString('en-US', { timeZone: timezone }),
          };
        },
      ),
      tool(
        'list_catalog',
        'The available groups (tree), sensors (with type + unit + group), and measurement types. Use the ids it returns when calling other tools.',
        z.object({}),
        () => this.catalog(),
      ),
      tool(
        'get_latest',
        'The most recent reading per sensor. Scope with groupId (its whole subtree), typeKey, or a single sensorId.',
        z.object({
          groupId: z.string().optional(),
          sensorId: z.string().optional(),
          typeKey: z.string().optional(),
        }),
        (input) => this.getLatest(input),
      ),
      tool(
        'query_aggregate',
        'A single avg/min/max/count over a time window for a group subtree (optionally one type). For "what was the average temp last night".',
        z.object({
          groupId: z.string(),
          typeKey: z.string().optional(),
          start: z.string().describe('ISO 8601'),
          end: z.string().describe('ISO 8601'),
        }),
        (input) => this.queryAggregate(input),
      ),
      tool(
        'query_series',
        'A bucketed time series for a group subtree (optionally one type) — renders as a chart. For "temperature last week, day by day" use bucket "1 day".',
        z.object({
          groupId: z.string(),
          typeKey: z.string().optional(),
          bucket: z.string().describe('e.g. "1 hour", "1 day"'),
          start: z.string().describe('ISO 8601'),
          end: z.string().describe('ISO 8601'),
          agg: AGG.optional(),
        }),
        (input) => this.querySeries(input),
      ),
      tool(
        'compare',
        'Overlay several aggregate series (each a group subtree + optional type) on one chart. For "difference between the bedrooms".',
        z.object({
          specs: z
            .array(
              z.object({
                groupId: z.string(),
                typeKey: z.string().optional(),
                agg: AGG.optional(),
              }),
            )
            .min(1)
            .max(6),
          bucket: z.string(),
          start: z.string().describe('ISO 8601'),
          end: z.string().describe('ISO 8601'),
        }),
        (input) => this.compare(input),
      ),
      tool(
        'active_alerts',
        'Alert rules currently in the ALERTING state, plus recent alert events.',
        z.object({}),
        () => this.activeAlerts(),
      ),
      tool(
        'system_stats',
        'TimescaleDB hypertable stats for the readings (row count, chunks, compression, size).',
        z.object({}),
        () => this.admin.hypertableStats(HypertableModel.SensorReading),
      ),
    ];
  }

  // ---- tool implementations -------------------------------------------------

  private async catalog(): Promise<Catalog> {
    const [groups, sensors, types] = await Promise.all([
      this.groups.findMany(),
      this.sensors.findMany(),
      this.sensors.findTypes(),
    ]);
    const unitByKey = new Map(types.map((t) => [t.key, t.unit]));
    return {
      groups: groups.map((g) => ({
        id: g.id,
        name: g.name,
        parentId: g.parentId,
      })),
      sensors: sensors.map((s) => ({
        id: s.id,
        name: s.name,
        typeKey: s.typeKey,
        unit: unitByKey.get(s.typeKey) ?? '',
        groupId: s.groupId,
      })),
      types: types.map((t) => ({ key: t.key, label: t.label, unit: t.unit })),
    };
  }

  private async resolveSensorIds(args: {
    groupId?: string;
    sensorId?: string;
    typeKey?: string;
  }): Promise<string[]> {
    if (args.sensorId) return [args.sensorId];
    const where: { typeKey?: string; groupId?: { in: string[] } } = {};
    if (args.typeKey) where.typeKey = args.typeKey;
    if (args.groupId) {
      where.groupId = { in: await this.groups.descendantIds(args.groupId) };
    }
    const rows = await this.prisma.sensor.findMany({
      where,
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  private async getLatest(args: {
    groupId?: string;
    sensorId?: string;
    typeKey?: string;
  }) {
    const ids = await this.resolveSensorIds(args);
    const [sensors, latest] = await Promise.all([
      this.prisma.sensor.findMany({
        where: { id: { in: ids } },
        include: { type: true },
      }),
      this.readings.latestForSensors(ids),
    ]);
    const byId = new Map(latest.map((l) => [l.sensorId, l]));
    return {
      kind: 'values',
      items: sensors.map((s) => {
        const l = byId.get(s.id);
        return {
          sensorId: s.id,
          name: s.name,
          type: s.type.label,
          unit: s.type.unit,
          value: l ? l.value : null,
          at: l ? l.time.toISOString() : null,
        };
      }),
    };
  }

  private async queryAggregate(args: {
    groupId: string;
    typeKey?: string;
    start: string;
    end: string;
  }) {
    const agg = await this.readings.aggregateForGroup(
      args.groupId,
      args.typeKey,
      new Date(args.start),
      new Date(args.end),
    );
    return {
      kind: 'stat',
      ...agg,
      unit: await this.unitFor(args.typeKey),
      groupName: await this.groupName(args.groupId),
      typeKey: args.typeKey ?? null,
      start: args.start,
      end: args.end,
    };
  }

  private async querySeries(args: {
    groupId: string;
    typeKey?: string;
    bucket: string;
    start: string;
    end: string;
    agg?: 'AVG' | 'MIN' | 'MAX';
  }) {
    const [series] = await this.readings.groupSeries({
      specs: [
        { groupId: args.groupId, type: args.typeKey, agg: args.agg ?? 'AVG' },
      ],
      bucket: args.bucket,
      start: new Date(args.start),
      end: new Date(args.end),
    } as never);
    return {
      kind: 'series',
      title: `${await this.groupName(args.groupId)}${args.typeKey ? ` · ${args.typeKey}` : ''}`,
      unit: await this.unitFor(args.typeKey),
      bucket: args.bucket,
      chartHint: /day|week|month/.test(args.bucket) ? 'bar' : 'line',
      points: series.points.map((p) => ({
        t: new Date(p.bucket).toISOString(),
        value: p.value,
      })),
    };
  }

  private async compare(args: {
    specs: { groupId: string; typeKey?: string; agg?: 'AVG' | 'MIN' | 'MAX' }[];
    bucket: string;
    start: string;
    end: string;
  }) {
    const result = await this.readings.groupSeries({
      specs: args.specs.map((s) => ({
        groupId: s.groupId,
        type: s.typeKey,
        agg: s.agg ?? 'AVG',
      })),
      bucket: args.bucket,
      start: new Date(args.start),
      end: new Date(args.end),
    } as never);
    const series = await Promise.all(
      result.map(async (r, i) => ({
        label: `${await this.groupName(args.specs[i].groupId)}${args.specs[i].typeKey ? ` · ${args.specs[i].typeKey}` : ''}`,
        unit: await this.unitFor(args.specs[i].typeKey),
        points: r.points.map((p) => ({
          t: new Date(p.bucket).toISOString(),
          value: p.value,
        })),
      })),
    );
    return {
      kind: 'compare',
      bucket: args.bucket,
      chartHint: /day|week|month/.test(args.bucket) ? 'bar' : 'line',
      series,
    };
  }

  private async activeAlerts() {
    const [rules, events] = await Promise.all([
      this.alerts.allRules(),
      this.alerts.events(undefined, 20),
    ]);
    return {
      kind: 'alerts',
      alerting: rules.filter((r) => r.state === 'ALERTING'),
      recentEvents: events,
    };
  }

  private async unitFor(typeKey?: string): Promise<string> {
    if (!typeKey) return '';
    const t = await this.prisma.sensorType.findUnique({
      where: { key: typeKey },
    });
    return t?.unit ?? '';
  }

  private async groupName(id: string): Promise<string> {
    const g = await this.prisma.sensorGroup.findUnique({ where: { id } });
    return g?.name ?? id;
  }
}
