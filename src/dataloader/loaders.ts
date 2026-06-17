import DataLoader from 'dataloader';
import type { ExtendedPrismaClient } from '../prisma/prisma-client';
import type { SensorReading } from '../sensor/models/sensor.model';

export interface Loaders {
  /** Recent readings (last 24h) batched by sensorId — avoids the N+1 when
   * resolving `Sensor.readings` across a list of sensors. */
  readingsBySensor: DataLoader<string, SensorReading[]>;
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
  };
}
