import type { Server } from 'node:http';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import {
  ExtendedPrismaClient,
  PRISMA_CLIENT,
} from '../src/prisma/prisma-client';

/**
 * End-to-end happy path against a real TimescaleDB: create a sensor + alert rule,
 * ingest a flapping series, and assert the alert engine, timeBucket rollup,
 * continuous-aggregate export, and admin stats all behave.
 */
describe('GraphQL flow (e2e)', () => {
  let app: INestApplication;
  let server: Server;
  let prisma: ExtendedPrismaClient;
  let sensorId: string;

  interface GqlResponse<T> {
    data?: T;
    errors?: { message: string }[];
  }

  const gql = async <T>(query: string): Promise<T> => {
    const res = await request(server)
      .post('/graphql')
      .send({ query })
      .expect(200);
    const body = res.body as GqlResponse<T>;
    if (body.errors?.length) {
      throw new Error(`GraphQL error: ${JSON.stringify(body.errors)}`);
    }
    return body.data as T;
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
    server = app.getHttpServer() as Server;
    prisma = app.get<ExtendedPrismaClient>(PRISMA_CLIENT);
  });

  afterAll(async () => {
    if (sensorId) {
      await prisma.sensor.delete({ where: { id: sensorId } }).catch(() => {});
    }
    await app.close();
  });

  it('creates a sensor and a per-sensor alert rule', async () => {
    const created = await gql<{ createSensor: { id: string } }>(
      `mutation { createSensor(input: { name: "E2E Boiler", typeKey: "TEMPERATURE" }) { id } }`,
    );
    sensorId = created.createSensor.id;
    expect(sensorId).toBeTruthy();

    const rule = await gql<{ createAlertRule: { state: string } }>(
      `mutation { createAlertRule(input: { sensorId: "${sensorId}", direction: ABOVE, threshold: 35, clearThreshold: 33 }) { state } }`,
    );
    expect(rule.createAlertRule.state).toBe('OK');
  });

  it('fires exactly one RAISED + one CLEARED across a flapping series', async () => {
    const base = Date.now() - 10 * 60 * 1000;
    const series = [34.9, 35.2, 34.9, 32];
    for (let i = 0; i < series.length; i++) {
      const time = new Date(base + i * 60 * 1000).toISOString();
      await gql(
        `mutation { ingestReading(input: { sensorId: "${sensorId}", value: ${series[i]}, time: "${time}" }) { value } }`,
      );
    }

    const { alertEvents } = await gql<{
      alertEvents: { kind: string; value: number }[];
    }>(`{ alertEvents(sensorId: "${sensorId}") { kind value } }`);

    // desc by createdAt: CLEARED most recent, RAISED before it.
    expect(alertEvents.map((e) => e.kind)).toEqual(['CLEARED', 'RAISED']);
  });

  it('rolls up raw readings with timeBucket', async () => {
    const start = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
    const end = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const { sensorReadingsBucketed } = await gql<{
      sensorReadingsBucketed: { count: number; max: number | null }[];
    }>(
      `{ sensorReadingsBucketed(sensorId: "${sensorId}", bucket: "1 hour", start: "${start}", end: "${end}") { count max } }`,
    );
    const total = sensorReadingsBucketed.reduce((sum, b) => sum + b.count, 0);
    expect(total).toBe(4);
  });

  it('exports rows via the continuous aggregate after refresh', async () => {
    await gql(`mutation { refreshSensorReadingHourly }`);
    const { sensorReadingsHourly } = await gql<{
      sensorReadingsHourly: { samples: number }[];
    }>(`{ sensorReadingsHourly(sensorId: "${sensorId}") { bucket samples } }`);
    expect(sensorReadingsHourly.length).toBeGreaterThan(0);
  });

  it('reports hypertable stats via the admin API', async () => {
    const { hypertableStats } = await gql<{
      hypertableStats: { totalChunks: number; approximateRowCount: number };
    }>(
      `{ hypertableStats(model: SensorReading) { totalChunks approximateRowCount } }`,
    );
    expect(hypertableStats.totalChunks).toBeGreaterThanOrEqual(1);
  });
});
