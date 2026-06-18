import 'dotenv/config';
import {
  createPrismaClient,
  type ExtendedPrismaClient,
} from '../src/prisma/prisma-client';

// typeKey references the SensorType rows seeded by the dynamic-sensor-types
// migration (Temperature / Pressure / Humidity + the AirGradient set).
const SENSORS = [
  { id: 'temp-1', name: 'Boiler temperature', typeKey: 'TEMPERATURE' },
  { id: 'pres-1', name: 'Line pressure', typeKey: 'PRESSURE' },
  { id: 'hum-1', name: 'Room humidity', typeKey: 'HUMIDITY' },
] as const;

// Per-sensor alert rules with a hysteresis reset band.
const RULES = [
  { sensorId: 'temp-1', direction: 'ABOVE', threshold: 35, clearThreshold: 33 },
  {
    sensorId: 'pres-1',
    direction: 'BELOW',
    threshold: 980,
    clearThreshold: 1000,
  },
  { sensorId: 'hum-1', direction: 'ABOVE', threshold: 80, clearThreshold: 75 },
] as const;

/** Build ~6h of 10-minute readings; the temperature series deliberately
 * oscillates across 35°C to exercise hysteresis later. */
function buildReadings() {
  const now = Date.now();
  const rows: { time: Date; sensorId: string; value: number }[] = [];
  const steps = 36; // 6h at 10-min spacing

  for (let i = steps; i >= 0; i--) {
    const time = new Date(now - i * 10 * 60 * 1000);
    // temperature climbs toward and wobbles around the 35°C threshold
    const temp = 28 + (steps - i) * 0.25 + (i % 2 === 0 ? 0.1 : -0.1);
    rows.push({ time, sensorId: 'temp-1', value: Number(temp.toFixed(2)) });
    rows.push({
      time,
      sensorId: 'pres-1',
      value: Number((1010 - (i % 5) * 8).toFixed(2)),
    });
    rows.push({
      time,
      sensorId: 'hum-1',
      value: Number((60 + (i % 7) * 3).toFixed(2)),
    });
  }
  return rows;
}

async function main(prisma: ExtendedPrismaClient) {
  // Idempotent reseed: clear dependent rows first.
  await prisma.alertEvent.deleteMany();
  await prisma.sensorReading.deleteMany();
  await prisma.alertRule.deleteMany();
  await prisma.sensor.deleteMany();

  for (const sensor of SENSORS) {
    await prisma.sensor.create({ data: sensor });
  }
  for (const rule of RULES) {
    await prisma.alertRule.create({ data: rule });
  }

  const readings = buildReadings();
  await prisma.sensorReading.createMany({ data: readings });

  console.log(
    `Seeded ${SENSORS.length} sensors, ${RULES.length} alert rules, ${readings.length} readings.`,
  );
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to run the seed');
}

const prisma = createPrismaClient(databaseUrl);
main(prisma)
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
