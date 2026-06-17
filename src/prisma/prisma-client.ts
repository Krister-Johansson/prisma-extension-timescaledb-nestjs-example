import { PrismaPg } from '@prisma/adapter-pg';
import { timescaledb } from 'prisma-extension-timescaledb';
import { PrismaClient } from '../generated/prisma/client.js';
import { registry } from '../generated/timescale/index.js';

/** DI token for the extended Prisma client. */
export const PRISMA_CLIENT = Symbol('PRISMA_CLIENT');

/**
 * Build a Prisma client wired to Postgres via the driver adapter and extended
 * with the TimescaleDB extension — this is what adds `model.timeBucket(...)` and
 * the `$timescale` management namespace.
 */
export function createPrismaClient(connectionString: string) {
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter }).$extends(timescaledb(registry));
}

/**
 * The concrete (extended) client type. The `$extends` result is an anonymous
 * type, so we capture it here and inject it via the PRISMA_CLIENT token.
 */
export type ExtendedPrismaClient = ReturnType<typeof createPrismaClient>;
