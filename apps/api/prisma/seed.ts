import 'dotenv/config';
import {
  createPrismaClient,
  type ExtendedPrismaClient,
} from '../src/prisma/prisma-client';

// ---------------------------------------------------------------------------
// The demo world: an AirGradient "house" — three indoor ONE monitors (Bedroom,
// Living room, Office) under a House group, plus one outdoor Open Air monitor.
// Each sensor gets an emulator and 3 years of 5-minute history ending *now*, so
// the dashboards and continuous-aggregate views are never stale on a fresh seed.
// ---------------------------------------------------------------------------

// The 12 measurement types (also created by the dynamic-sensor-types migration;
// upserted here so a clean database still gets them).
const TYPES = [
  { key: 'TEMPERATURE', label: 'Temperature', unit: '°C' },
  { key: 'HUMIDITY', label: 'Humidity', unit: '%' },
  { key: 'CO2', label: 'CO₂', unit: 'ppm' },
  { key: 'PM1', label: 'PM1.0', unit: 'µg/m³' },
  { key: 'PM2_5', label: 'PM2.5', unit: 'µg/m³' },
  { key: 'PM10', label: 'PM10', unit: 'µg/m³' },
  { key: 'PARTICLE_COUNT', label: 'Particle count', unit: '#/0.1L' },
  { key: 'TVOC_INDEX', label: 'TVOC index', unit: 'idx' },
  { key: 'TVOC_RAW', label: 'TVOC raw', unit: 'raw' },
  { key: 'NOX_INDEX', label: 'NOx index', unit: 'idx' },
  { key: 'NOX_RAW', label: 'NOx raw', unit: 'raw' },
  { key: 'PRESSURE', label: 'Pressure', unit: 'hPa' },
] as const;

const INDOOR_ROOMS = ['Bedroom', 'Living room', 'Office'] as const;

// AirGradient ONE (indoor) reports these; the Open Air (outdoor) lacks CO₂.
const INDOOR_TYPES = [
  'TEMPERATURE',
  'HUMIDITY',
  'CO2',
  'PM2_5',
  'TVOC_INDEX',
  'NOX_INDEX',
] as const;
const OUTDOOR_TYPES = [
  'TEMPERATURE',
  'HUMIDITY',
  'PM2_5',
  'TVOC_INDEX',
  'NOX_INDEX',
] as const;

// Short label used in the sensor's display name (e.g. "Bedroom CO₂").
const SENSOR_LABEL: Record<string, string> = {
  TEMPERATURE: 'Temperature',
  HUMIDITY: 'Humidity',
  CO2: 'CO₂',
  PM2_5: 'PM2.5',
  TVOC_INDEX: 'TVOC',
  NOX_INDEX: 'NOx',
};

type Location = 'indoor' | 'outdoor';

// [min, max] per type — drives both the emulator range and the seeded history.
const RANGE: Record<string, Record<Location, [number, number]>> = {
  TEMPERATURE: { indoor: [19, 25], outdoor: [6, 28] },
  HUMIDITY: { indoor: [35, 60], outdoor: [45, 90] },
  CO2: { indoor: [420, 1100], outdoor: [420, 1100] },
  PM2_5: { indoor: [1, 30], outdoor: [3, 60] },
  TVOC_INDEX: { indoor: [50, 250], outdoor: [30, 150] },
  NOX_INDEX: { indoor: [1, 40], outdoor: [5, 80] },
};

const HISTORY_YEARS = 3;
const READING_INTERVAL = '5 minutes';
const EMULATOR_INTERVAL_SECONDS = 5;

interface SeededSensor {
  id: string;
  name: string;
  min: number;
  max: number;
  location: Location;
}

async function main(prisma: ExtendedPrismaClient) {
  console.log('Resetting demo data…');
  // FK-safe order; SensorReading is a hypertable, so TRUNCATE is far faster than
  // deleting millions of rows on a reseed.
  await prisma.alertEvent.deleteMany();
  await prisma.alertRule.deleteMany();
  await prisma.emulator.deleteMany();
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "SensorReading"');
  await prisma.sensor.deleteMany();
  await prisma.sensorGroup.deleteMany();

  for (const t of TYPES) {
    await prisma.sensorType.upsert({
      where: { key: t.key },
      create: { ...t },
      update: { label: t.label, unit: t.unit },
    });
  }

  // Groups: House (with the three rooms) + a top-level Outdoor.
  const house = await prisma.sensorGroup.create({ data: { name: 'House' } });
  const outdoor = await prisma.sensorGroup.create({
    data: { name: 'Outdoor' },
  });
  const roomId: Record<string, string> = {};
  for (const room of INDOOR_ROOMS) {
    const g = await prisma.sensorGroup.create({
      data: { name: room, parentId: house.id },
    });
    roomId[room] = g.id;
  }

  // Sensors + their emulators.
  const sensors: SeededSensor[] = [];
  const addSensor = async (
    name: string,
    typeKey: string,
    groupId: string,
    location: Location,
  ) => {
    const [min, max] = RANGE[typeKey][location];
    const sensor = await prisma.sensor.create({
      data: { name, typeKey, groupId },
    });
    await prisma.emulator.create({
      data: {
        sensorId: sensor.id,
        min,
        max,
        intervalSeconds: EMULATOR_INTERVAL_SECONDS,
        // running defaults to true — the ticker continues live data from now on.
      },
    });
    sensors.push({ id: sensor.id, name, min, max, location });
  };

  for (const room of INDOOR_ROOMS) {
    for (const typeKey of INDOOR_TYPES) {
      await addSensor(
        `${room} ${SENSOR_LABEL[typeKey]}`,
        typeKey,
        roomId[room],
        'indoor',
      );
    }
  }
  for (const typeKey of OUTDOOR_TYPES) {
    await addSensor(
      `Outdoor ${SENSOR_LABEL[typeKey]}`,
      typeKey,
      outdoor.id,
      'outdoor',
    );
  }

  // History: 3 years of 5-minute readings per sensor, ending now. Generated in
  // the database (generate_series) so ~7M rows insert in seconds rather than
  // round-tripping from Node. Each value = midpoint + a diurnal swing (peaks
  // mid-afternoon) + a seasonal swing (peaks ~mid-year) + light noise, clamped
  // to the sensor's range.
  const end = new Date();
  const start = new Date(
    end.getTime() - HISTORY_YEARS * 365.25 * 24 * 60 * 60 * 1000,
  );
  console.log(
    `Generating ${HISTORY_YEARS}y of ${READING_INTERVAL} history for ${sensors.length} sensors…`,
  );
  let totalRows = 0;
  for (const s of sensors) {
    const base = (s.min + s.max) / 2;
    const amp = s.max - s.min;
    const diurnal = amp * 0.28;
    const seasonal = amp * 0.16;
    const noise = amp * 0.06;
    const inserted = await prisma.$executeRaw`
      INSERT INTO "SensorReading" ("sensorId", "time", "value")
      SELECT ${s.id}, t,
        GREATEST(${s.min}::float8, LEAST(${s.max}::float8,
          ${base}::float8
          + ${diurnal}::float8 * sin(2 * pi() * ((extract(hour from t) + extract(minute from t) / 60.0 - 9) / 24.0))
          + ${seasonal}::float8 * sin(2 * pi() * ((extract(doy from t) - 80) / 365.0))
          + ${noise}::float8 * (random() * 2 - 1)
        ))::float8
      FROM generate_series(${start}::timestamptz, ${end}::timestamptz, ${READING_INTERVAL}::interval) AS t
    `;
    totalRows += Number(inserted);
    process.stdout.write(
      `  ${s.name.padEnd(24)} ${Number(inserted).toLocaleString()} rows\n`,
    );
  }

  // Refresh the hourly continuous aggregate over the whole range so the export
  // views reflect the new history immediately (not just live real-time agg).
  console.log('Refreshing the hourly continuous aggregate…');
  await prisma.$executeRawUnsafe(
    `CALL refresh_continuous_aggregate('"SensorReadingHourly"', NULL, NULL)`,
  );

  console.log(
    `Seeded ${TYPES.length} types, ${INDOOR_ROOMS.length + 2} groups, ${sensors.length} sensors + emulators, ${totalRows.toLocaleString()} readings up to ${end.toISOString()}.`,
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
