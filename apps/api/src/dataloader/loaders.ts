import DataLoader from 'dataloader';
import { Prisma } from '../generated/prisma/client.js';
import type { AlertRule } from '../alert/models/alert-rule.model';
import type { ExtendedPrismaClient } from '../prisma/prisma-client';
import type { SensorType } from '../sensor/models/sensor-type.model';
import type { SensorReading } from '../sensor/models/sensor.model';

export interface Loaders {
  /** The most recent readings per sensor (newest first, capped), batched by
   * sensorId — avoids the N+1 when resolving `Sensor.readings` across a list of
   * sensors, and bounds the payload regardless of ingest rate. */
  readingsBySensor: DataLoader<string, SensorReading[]>;
  /** The single newest reading per sensor (or null) — a narrow contract for
   * "last value" headers, batched so a list still costs one query. */
  latestReadingBySensor: DataLoader<string, SensorReading | null>;
  /** Alert rules batched by sensorId — avoids the N+1 when resolving
   * `Sensor.rules` across a list of sensors. */
  rulesBySensor: DataLoader<string, AlertRule[]>;
  /** Measurement type batched by key — resolves `Sensor.type` in one query
   * across a list of sensors. */
  sensorTypeByKey: DataLoader<string, SensorType>;
}

export interface GraphQLContext {
  loaders: Loaders;
}

/** Cap per sensor — enough to feed a ~48-point sparkline + the latest value,
 * without scanning the whole hypertable for high-frequency sensors. */
const MAX_READINGS_PER_SENSOR = 60;

/** Only rank rows from the recent past so TimescaleDB excludes old chunks — the
 * newest 60 readings (and the latest value) of any live sensor are well within
 * this window. Without it, the window function scans years of history. A sensor
 * idle longer than this simply shows no recent value, which is the honest state. */
const RECENT_WINDOW = Prisma.sql`AND time > now() - interval '30 days'`;

/** Build a fresh set of loaders per request (loaders cache within one request). */
export function createLoaders(prisma: ExtendedPrismaClient): Loaders {
  return {
    readingsBySensor: new DataLoader<string, SensorReading[]>(
      async (sensorIds) => {
        // Top-N-per-sensor: a window function ranks each sensor's rows by time
        // and keeps the newest N. Bounded payload vs. an unbounded 24h scan.
        const rows = await prisma.$queryRaw<SensorReading[]>`
          SELECT time, "sensorId", value
          FROM (
            SELECT time, "sensorId", value,
                   ROW_NUMBER() OVER (
                     PARTITION BY "sensorId" ORDER BY time DESC
                   ) AS rn
            FROM "SensorReading"
            WHERE "sensorId" IN (${Prisma.join([...sensorIds])})
              ${RECENT_WINDOW}
          ) ranked
          WHERE rn <= ${MAX_READINGS_PER_SENSOR}
          ORDER BY time DESC
        `;

        const bySensor = new Map<string, SensorReading[]>(
          sensorIds.map((id) => [id, []]),
        );
        for (const row of rows) {
          bySensor.get(row.sensorId)?.push(row);
        }
        return sensorIds.map((id) => bySensor.get(id) ?? []);
      },
    ),

    latestReadingBySensor: new DataLoader<string, SensorReading | null>(
      async (sensorIds) => {
        // Just the newest row per sensor (rn = 1) — one row each, not the
        // whole recent window, for "last value" use cases.
        const rows = await prisma.$queryRaw<SensorReading[]>`
          SELECT time, "sensorId", value
          FROM (
            SELECT time, "sensorId", value,
                   ROW_NUMBER() OVER (
                     PARTITION BY "sensorId" ORDER BY time DESC
                   ) AS rn
            FROM "SensorReading"
            WHERE "sensorId" IN (${Prisma.join([...sensorIds])})
              ${RECENT_WINDOW}
          ) ranked
          WHERE rn = 1
        `;

        const bySensor = new Map<string, SensorReading>(
          rows.map((row) => [row.sensorId, row]),
        );
        return sensorIds.map((id) => bySensor.get(id) ?? null);
      },
    ),

    rulesBySensor: new DataLoader<string, AlertRule[]>(async (sensorIds) => {
      const rows = await prisma.alertRule.findMany({
        where: { sensorId: { in: [...sensorIds] } },
        orderBy: { createdAt: 'asc' },
      });

      const bySensor = new Map<string, AlertRule[]>(
        sensorIds.map((id) => [id, []]),
      );
      for (const row of rows) {
        bySensor.get(row.sensorId)?.push(row);
      }
      return sensorIds.map((id) => bySensor.get(id) ?? []);
    }),

    sensorTypeByKey: new DataLoader<string, SensorType>(async (keys) => {
      const rows = await prisma.sensorType.findMany({
        where: { key: { in: [...keys] } },
      });
      const byKey = new Map(rows.map((r) => [r.key, r]));
      // A sensor's typeKey is a FK, so a row should always exist; fall back to a
      // minimal placeholder rather than throwing if a type was just removed.
      return keys.map(
        (k) =>
          byKey.get(k) ?? { key: k, label: k, unit: '', createdAt: new Date() },
      );
    }),
  };
}
