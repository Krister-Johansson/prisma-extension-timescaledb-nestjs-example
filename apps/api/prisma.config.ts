import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env['DATABASE_URL'],
    // Must point at a TimescaleDB-capable database (same docker image): the first
    // migration runs `CREATE EXTENSION timescaledb` against the shadow DB too.
    shadowDatabaseUrl: process.env['SHADOW_DATABASE_URL'],
  },
});
