# prisma-extension-timescaledb — NestJS example

A runnable [NestJS](https://nestjs.com/) + code-first GraphQL example that exercises
[`prisma-extension-timescaledb`](https://www.npmjs.com/package/prisma-extension-timescaledb)
end-to-end against a real TimescaleDB.

It models **sensors** (temperature, pressure, humidity) whose raw readings are written
transactionally through Prisma into a TimescaleDB **hypertable**, rolled up by
**continuous aggregates** for export, and watched by per-sensor **alert rules** with a
**hysteresis reset band** so values oscillating around a threshold don't re-fire alerts.

> Status: work in progress, built up across small PRs. See the roadmap below.

## Stack

> _Currently installed: NestJS, ESLint, Jest. Prisma, GraphQL/Apollo, and the
> TimescaleDB packages below are added in later PRs (see the roadmap)._

- NestJS 11 (code-first GraphQL via `@nestjs/apollo`)
- Prisma 7 with the `@prisma/adapter-pg` driver adapter
- `prisma-extension-timescaledb` for hypertables, continuous aggregates, retention &
  compression policies, and typed `timeBucket(...)` queries
- `prisma-nestjs-graphql` to generate GraphQL where-inputs from the schema
- PostgreSQL + TimescaleDB via Docker Compose

## Getting started

```bash
npm install
cp .env.example .env
npm run db:up      # start TimescaleDB (+ shadow DB) via Docker Compose
npm run start:dev
```

`npm run db:up` starts a `timescale/timescaledb` container (a TimescaleDB-bundled
Postgres — not vanilla Postgres) with an `app` database and an empty `shadow`
database. It publishes host port **5433** (not 5432) so it can run alongside another
local Postgres. The shadow DB lives on the same server because `prisma migrate dev`
validates migrations against it, and TimescaleDB's `CREATE EXTENSION` must run there
too. Stop it with `npm run db:down`; tail logs with `npm run db:logs`.

(The Prisma schema and GraphQL API arrive in subsequent PRs — see the roadmap.)

## Configuration

Environment variables are validated at bootstrap (`src/config/env.validation.ts`); the
app refuses to start if they are invalid.

| Variable   | Default       | Description                  |
| ---------- | ------------- | ---------------------------- |
| `NODE_ENV` | `development` | Runtime environment          |
| `PORT`     | `3000`        | HTTP port the app listens on |

## Error handling

Errors are handled by **global exception filters** (`src/common/filters/`) registered via
`APP_FILTER`, producing a consistent error envelope. The catch-all filter lands first;
Prisma- and GraphQL-specific filters are layered on in their respective PRs.

## Testing

```bash
npm test        # unit tests
npm run test:e2e
```

## Roadmap

1. ✅ Scaffold app, config validation, global exception filter, tooling, CI, CodeRabbit
2. ✅ Docker Compose TimescaleDB + shadow database
3. Prisma 7 + timescale extension + schema (hypertable, continuous aggregates, alerts) + Prisma exception filter
4. GraphQL + Sensor module + DataLoader + GraphQL-aware exception filter
5. Readings ingest + `timeBucket` queries + continuous-aggregate export
6. Alerts with hysteresis + unit tests
7. Timescale admin module (`$timescale` introspection & policies)
8. End-to-end tests

## License

[MIT](./LICENSE)
