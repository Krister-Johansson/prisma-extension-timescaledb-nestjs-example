import { Inject, Injectable, Logger } from '@nestjs/common';
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

@Injectable()
export class AnomalyService {
  private readonly logger = new Logger(AnomalyService.name);

  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: ExtendedPrismaClient,
    @Inject(PUB_SUB) private readonly pubSub: PubSub,
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
    return anomaly;
  }
}
