import 'dotenv/config';
import { Prisma } from '../src/generated/prisma/client.js';
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
  await prisma.dashboard.deleteMany(); // widgets cascade
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

  // Structure-only mode: SEED_SKIP_READINGS gives the same types/groups/sensors/
  // emulators/dashboards with NO reading history — a clean slate for watching the
  // live emulators (and the anomaly detector) fill in data from scratch.
  const skipReadings =
    process.env.SEED_SKIP_READINGS === '1' ||
    process.env.SEED_SKIP_READINGS === 'true';

  // History: 3 years of 5-minute readings per sensor, ending now. Generated in
  // the database (generate_series) so ~7M rows insert in seconds rather than
  // round-tripping from Node. Each value = midpoint + a diurnal swing (peaks
  // mid-afternoon) + a seasonal swing (peaks ~mid-year) + light noise, clamped
  // to the sensor's range.
  const end = new Date();
  let totalRows = 0;
  if (skipReadings) {
    console.log(
      'SEED_SKIP_READINGS set — seeding structure only, no reading history.',
    );
  } else {
    const start = new Date(
      end.getTime() - HISTORY_YEARS * 365.25 * 24 * 60 * 60 * 1000,
    );
    console.log(
      `Generating ${HISTORY_YEARS}y of ${READING_INTERVAL} history for ${sensors.length} sensors…`,
    );
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
  }

  // Refresh the hourly continuous aggregate so the export views reflect the
  // current source — the new history, or empty after a structure-only seed.
  console.log('Refreshing the hourly continuous aggregate…');
  await prisma.$executeRawUnsafe(
    `CALL refresh_continuous_aggregate('"SensorReadingHourly"', NULL, NULL)`,
  );

  // Default dashboards so a fresh seed lands on populated, customizable views.
  const sid = (name: string) => {
    const s = sensors.find((x) => x.name === name);
    if (!s) throw new Error(`seed: missing sensor "${name}"`);
    return s.id;
  };
  const co2 = { agg: 'last', window: '1h', min: 400, max: 1500, warn: 1000, danger: 1200 };
  interface SeedWidget {
    type: string;
    x: number;
    y: number;
    w: number;
    h: number;
    config: unknown;
  }
  const DASHBOARDS: { name: string; widgets: SeedWidget[] }[] = [
    {
      name: 'Home',
      widgets: [
        { type: 'chart', x: 0, y: 0, w: 12, h: 6, config: { title: 'Indoor vs Outdoor temperature', window: '7d', chartType: 'line', series: [{ scope: 'group', groupId: house.id, typeKey: 'TEMPERATURE', agg: 'AVG', label: 'Indoor' }, { scope: 'group', groupId: outdoor.id, typeKey: 'TEMPERATURE', agg: 'AVG', label: 'Outdoor' }] } },
        { type: 'stat', x: 0, y: 6, w: 3, h: 3, config: { title: 'Indoor temp', scope: 'group', groupId: house.id, typeKey: 'TEMPERATURE', agg: 'last', window: '1h', sparkline: true } },
        { type: 'stat', x: 3, y: 6, w: 3, h: 3, config: { title: 'Indoor humidity', scope: 'group', groupId: house.id, typeKey: 'HUMIDITY', agg: 'last', window: '1h', sparkline: true } },
        { type: 'gauge', x: 6, y: 6, w: 3, h: 4, config: { title: 'Bedroom CO₂', scope: 'sensor', sensorId: sid('Bedroom CO₂'), ...co2 } },
        { type: 'alerts', x: 9, y: 6, w: 3, h: 4, config: { title: 'Recent alerts', limit: 8 } },
      ],
    },
    {
      name: 'Indoor',
      widgets: [
        { type: 'chart', x: 0, y: 0, w: 8, h: 5, config: { title: 'Room temperatures', window: '24h', chartType: 'line', series: INDOOR_ROOMS.map((room) => ({ scope: 'group', groupId: roomId[room], typeKey: 'TEMPERATURE', agg: 'AVG', label: room })) } },
        { type: 'table', x: 8, y: 0, w: 4, h: 8, config: { title: 'Indoor sensors', groupId: house.id } },
        { type: 'gauge', x: 0, y: 5, w: 4, h: 4, config: { title: 'Bedroom CO₂', scope: 'sensor', sensorId: sid('Bedroom CO₂'), ...co2 } },
        { type: 'gauge', x: 4, y: 5, w: 4, h: 4, config: { title: 'Office CO₂', scope: 'sensor', sensorId: sid('Office CO₂'), ...co2 } },
      ],
    },
    {
      name: 'Outdoor',
      widgets: [
        { type: 'stat', x: 0, y: 0, w: 3, h: 3, config: { title: 'Temperature', scope: 'sensor', sensorId: sid('Outdoor Temperature'), agg: 'last', window: '24h', sparkline: true } },
        { type: 'stat', x: 3, y: 0, w: 3, h: 3, config: { title: 'Humidity', scope: 'sensor', sensorId: sid('Outdoor Humidity'), agg: 'last', window: '24h', sparkline: true } },
        { type: 'gauge', x: 6, y: 0, w: 3, h: 4, config: { title: 'PM2.5', scope: 'sensor', sensorId: sid('Outdoor PM2.5'), agg: 'last', window: '1h', min: 0, max: 60, warn: 25, danger: 40 } },
        { type: 'table', x: 9, y: 0, w: 3, h: 7, config: { title: 'Outdoor sensors', groupId: outdoor.id } },
        { type: 'chart', x: 0, y: 3, w: 9, h: 5, config: { title: 'Outdoor temperature', window: '7d', chartType: 'area', series: [{ scope: 'sensor', sensorId: sid('Outdoor Temperature'), agg: 'AVG', label: 'Outdoor' }] } },
      ],
    },
  ];
  for (const [position, d] of DASHBOARDS.entries()) {
    const dash = await prisma.dashboard.create({
      data: {
        name: d.name,
        slug: d.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        position,
      },
    });
    for (const w of d.widgets) {
      await prisma.widget.create({
        data: {
          dashboardId: dash.id,
          type: w.type,
          x: w.x,
          y: w.y,
          w: w.w,
          h: w.h,
          config: w.config as Prisma.InputJsonValue,
        },
      });
    }
  }

  console.log(
    `Seeded ${TYPES.length} types, ${INDOOR_ROOMS.length + 2} groups, ${sensors.length} sensors + emulators, ${totalRows.toLocaleString()} readings, ${DASHBOARDS.length} dashboards up to ${end.toISOString()}.`,
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
