import DataLoader from 'dataloader';
import { Prisma } from '../generated/prisma/client.js';
import type { AlertRule } from '../alert/models/alert-rule.model';
import type { ExtendedPrismaClient } from '../prisma/prisma-client';
import type { SensorReading } from '../sensor/models/sensor.model';

export interface Loaders {
  /** The most recent readings per sensor (newest first, capped), batched by
   * sensorId — avoids the N+1 when resolving `Sensor.readings` across a list of
   * sensors, and bounds the payload regardless of ingest rate. */
  readingsBySensor: DataLoader<string, SensorReading[]>;
  /** Alert rules batched by sensorId — avoids the N+1 when resolving
   * `Sensor.rules` across a list of sensors. */
  rulesBySensor: DataLoader<string, AlertRule[]>;
}

export interface GraphQLContext {
  loaders: Loaders;
}

/** Cap per sensor — enough to feed a ~48-point sparkline + the latest value,
 * without scanning the whole hypertable for high-frequency sensors. */
const MAX_READINGS_PER_SENSOR = 60;

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
  };
}
