import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PubSub } from 'graphql-subscriptions';
import { AnomalySeverity } from '../generated/prisma/enums.js';
import { PRISMA_CLIENT } from '../prisma/prisma-client';
import type { ExtendedPrismaClient } from '../prisma/prisma-client';
import { PUB_SUB, TOPICS } from '../pubsub/pubsub.module';
import type { Anomaly } from './models/anomaly.model';

/** Rolling window (readings) the baseline median/MAD is computed over. */
const WINDOW = 120;
/** Need at least this much history before we'll judge a reading. */
const MIN_WINDOW = 20;
/** Modified z-score threshold to flag an anomaly (Iglewicz–Hoaglin: 3.5). */
const THRESHOLD = 3.5;
/** Above this score the anomaly is CRITICAL rather than WARNING. */
const CRITICAL_SCORE = 7;
/** MAD → normal-consistent σ. */
const MAD_TO_SIGMA = 1.4826;

interface WindowStats {
  median: number | null;
  mad: number | null;
  std: number | null;
  n: number;
}

interface ChatCompletion {
  choices?: { message?: { content?: string } }[];
}

const SUMMARY_SYSTEM =
  'You are a monitoring assistant for an IoT sensor platform. In ONE or two ' +
  'short sentences, plainly explain a detected sensor anomaly for an operator: ' +
  'what happened (the value vs the normal range), how far out it is, and the ' +
  'single most likely cause (sensor fault, a real environmental event, or a ' +
  'manual test entry). No preamble, no markdown, no restating the numbers as a ' +
  'list.';

@Injectable()
export class AnomalyService {
  private readonly logger = new Logger(AnomalyService.name);

  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: ExtendedPrismaClient,
    @Inject(PUB_SUB) private readonly pubSub: PubSub,
    private readonly config: ConfigService,
  ) {}

  /** Anomalies newest-first, optionally for one sensor and/or a [start, end)
   * time window. With a window the scan is bounded by the range (and dedupe
   * keeps anomalies sparse), so callers get every in-window anomaly — hence the
   * default jumps to the cap when a window is given so it isn't truncated. */
  list(sensorId?: string, take?: number, start?: Date, end?: Date) {
    const MAX_TAKE = 500;
    const fallback = start || end ? MAX_TAKE : 50;
    const safeTake = Math.min(Math.max(take ?? fallback, 1), MAX_TAKE);
    return this.prisma.anomaly.findMany({
      where: {
        ...(sensorId ? { sensorId } : {}),
        ...(start || end
          ? {
              time: {
                ...(start ? { gte: start } : {}),
                ...(end ? { lt: end } : {}),
              },
            }
          : {}),
      },
      orderBy: { time: 'desc' },
      take: safeTake,
    });
  }

  /**
   * Judge a freshly-ingested reading against the sensor's recent window using a
   * rolling MAD modified z-score. On a normal→anomalous transition, persist an
   * Anomaly and publish it. Best-effort — called from the ingest path.
   */
  async evaluateReading(
    sensorId: string,
    value: number,
    time: Date,
  ): Promise<Anomaly | null> {
    const rows = await this.prisma.$queryRaw<WindowStats[]>`
      WITH recent AS (
        SELECT value FROM "SensorReading"
        WHERE "sensorId" = ${sensorId} AND "time" < ${time}
        ORDER BY "time" DESC
        LIMIT ${WINDOW}
      ),
      base AS (
        SELECT
          percentile_cont(0.5) WITHIN GROUP (ORDER BY value) AS median,
          stddev_pop(value) AS std,
          count(*)::int AS n
        FROM recent
      )
      SELECT base.median, base.std, base.n,
        percentile_cont(0.5) WITHIN GROUP (ORDER BY abs(recent.value - base.median)) AS mad
      FROM recent, base
      GROUP BY base.median, base.std, base.n
    `;

    const stats = rows[0];
    if (!stats || stats.n < MIN_WINDOW || stats.median == null) return null;

    const median = stats.median;
    const mad = stats.mad ?? 0;
    // Prefer MAD (robust); fall back to stddev when the window is mostly
    // constant. If both are zero there's no spread to judge against.
    const sigma = mad > 0 ? mad * MAD_TO_SIGMA : (stats.std ?? 0);
    if (sigma <= 0) return null;

    const score = Math.abs(value - median) / sigma;
    const isAnomalous = score >= THRESHOLD;
    const severity =
      score >= CRITICAL_SCORE
        ? AnomalySeverity.CRITICAL
        : AnomalySeverity.WARNING;

    // Per-sensor state machine (mirrors alert hysteresis): flag only the ENTRY
    // into an anomalous spell, and clear the flag on return to normal — so a
    // sustained excursion produces exactly one anomaly. The whole read→decide→
    // write runs under a row lock on the sensor (SELECT … FOR UPDATE), so
    // concurrent ingests for the same sensor serialize and a stale normal-path
    // clear can't clobber a newer spell.
    const anomaly = await this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ inAnomaly: boolean }[]>`
        SELECT "inAnomaly" FROM "Sensor" WHERE id = ${sensorId} FOR UPDATE
      `;
      const wasInAnomaly = locked[0]?.inAnomaly ?? false;

      if (!isAnomalous) {
        if (wasInAnomaly) {
          await tx.sensor.update({
            where: { id: sensorId },
            data: { inAnomaly: false },
          });
        }
        return null;
      }
      if (wasInAnomaly) return null; // already inside an anomalous spell

      await tx.sensor.update({
        where: { id: sensorId },
        data: { inAnomaly: true },
      });
      return tx.anomaly.create({
        data: { sensorId, time, value, score, median, mad, severity },
      });
    });
    if (!anomaly) return null;

    this.logger.warn(
      `Anomaly on sensor ${sensorId}: value ${value} vs median ${median.toFixed(2)} (score ${score.toFixed(1)}, ${severity})`,
    );
    await this.pubSub.publish(TOPICS.anomalyDetected, {
      anomalyDetected: anomaly,
    });

    // Fire-and-forget: generate the AI summary without blocking ingestion.
    void this.summarize(anomaly).catch((error: unknown) => {
      this.logger.error(
        `Anomaly summary failed for ${anomaly.id}`,
        error instanceof Error ? error.stack : String(error),
      );
    });

    return anomaly;
  }

  /** Ask OpenRouter for a one-line plain-English summary of an anomaly and
   * persist it on the record. No-op when no API key is configured (e.g. CI). */
  private async summarize(anomaly: Anomaly): Promise<void> {
    const apiKey = this.config.get<string>('OPENROUTER_API_KEY');
    if (!apiKey) return;

    const sensor = await this.prisma.sensor.findUnique({
      where: { id: anomaly.sensorId },
      include: { type: true },
    });
    if (!sensor) return;

    const model =
      this.config.get<string>('OPENROUTER_MODEL') ??
      'anthropic/claude-opus-4.8';
    const unit = sensor.type.unit ? ` ${sensor.type.unit}` : '';
    const prompt =
      `Sensor "${sensor.name}" (${sensor.type.label}) recorded ${anomaly.value}${unit} ` +
      `at ${anomaly.time.toISOString()}. Its recent normal level is about ` +
      `${anomaly.median.toFixed(1)}${unit}, so this is ${anomaly.score.toFixed(1)} ` +
      `robust standard deviations out (${anomaly.severity.toLowerCase()}). ` +
      `Summarize this anomaly.`;

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      // Bound the fire-and-forget request so a stalled call can't leak forever.
      signal: AbortSignal.timeout(20_000),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-Title': 'SENTINEL anomaly summary',
      },
      body: JSON.stringify({
        model,
        max_tokens: 150,
        temperature: 0.3,
        messages: [
          { role: 'system', content: SUMMARY_SYSTEM },
          { role: 'user', content: prompt },
        ],
      }),
    });
    if (!res.ok) {
      this.logger.error(`OpenRouter returned ${res.status} for ${anomaly.id}`);
      return;
    }

    const data = (await res.json()) as ChatCompletion;
    const summary = data.choices?.[0]?.message?.content?.trim();
    if (!summary) return;

    const updated = await this.prisma.anomaly.update({
      where: { id: anomaly.id },
      data: { aiSummary: summary },
    });
    // Re-publish so live subscribers get the summary as it lands.
    await this.pubSub.publish(TOPICS.anomalyDetected, {
      anomalyDetected: updated,
    });
  }
}
