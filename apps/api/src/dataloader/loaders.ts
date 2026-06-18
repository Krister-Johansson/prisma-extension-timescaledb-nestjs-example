import DataLoader from 'dataloader';
import type { AlertRule } from '../alert/models/alert-rule.model';
import type { ExtendedPrismaClient } from '../prisma/prisma-client';
import type { SensorReading } from '../sensor/models/sensor.model';

export interface Loaders {
  /** Recent readings (last 24h) batched by sensorId — avoids the N+1 when
   * resolving `Sensor.readings` across a list of sensors. */
  readingsBySensor: DataLoader<string, SensorReading[]>;
  /** Alert rules batched by sensorId — avoids the N+1 when resolving
   * `Sensor.rules` across a list of sensors. */
  rulesBySensor: DataLoader<string, AlertRule[]>;
}

export interface GraphQLContext {
  loaders: Loaders;
}

const LOOKBACK_MS = 24 * 60 * 60 * 1000;

/** Build a fresh set of loaders per request (loaders cache within one request). */
export function createLoaders(prisma: ExtendedPrismaClient): Loaders {
  return {
    readingsBySensor: new DataLoader<string, SensorReading[]>(
      async (sensorIds) => {
        const since = new Date(Date.now() - LOOKBACK_MS);
        const rows = await prisma.sensorReading.findMany({
          where: { sensorId: { in: [...sensorIds] }, time: { gte: since } },
          orderBy: { time: 'desc' },
        });

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
