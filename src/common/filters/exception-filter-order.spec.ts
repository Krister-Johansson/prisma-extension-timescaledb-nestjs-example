import type { Server } from 'node:http';
import { Controller, Get, Provider } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { Prisma } from '../../generated/prisma/client.js';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { PrismaClientExceptionFilter } from './prisma-client-exception.filter';

@Controller()
class ThrowController {
  @Get('prisma')
  prisma(): never {
    throw new Prisma.PrismaClientKnownRequestError('Unique violation', {
      code: 'P2002',
      clientVersion: 'test',
      meta: { target: ['sensorId'] },
    });
  }

  @Get('generic')
  generic(): never {
    throw new Error('boom');
  }
}

// Mirrors AppModule: catch-all registered first, Prisma filter second. NestJS
// applies global APP_FILTER providers in REVERSE registration order, so the
// last-registered (Prisma) filter is tried first and the catch-all is the
// fallback — matching the NestJS docs' "declare the catch-all filter first".
const appModuleFilterOrder: Provider[] = [
  { provide: APP_FILTER, useClass: AllExceptionsFilter },
  { provide: APP_FILTER, useClass: PrismaClientExceptionFilter },
];

async function boot(filters: Provider[]) {
  const moduleRef = await Test.createTestingModule({
    controllers: [ThrowController],
    providers: [
      { provide: ConfigService, useValue: { get: () => 'test' } },
      ...filters,
    ],
  }).compile();
  const app = moduleRef.createNestApplication();
  await app.init();
  return app;
}

describe('global exception filter ordering', () => {
  let app: Awaited<ReturnType<typeof boot>>;

  beforeEach(async () => {
    app = await boot(appModuleFilterOrder);
  });

  afterEach(async () => {
    await app.close();
  });

  it('routes a Prisma P2002 error to the Prisma filter (409)', async () => {
    await request(app.getHttpServer() as Server)
      .get('/prisma')
      .expect(409);
  });

  it('routes a generic error to the catch-all filter (500)', async () => {
    await request(app.getHttpServer() as Server)
      .get('/generic')
      .expect(500);
  });
});
