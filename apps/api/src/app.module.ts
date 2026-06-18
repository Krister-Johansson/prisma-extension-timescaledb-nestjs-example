import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { GraphQLModule } from '@nestjs/graphql';
import { ScheduleModule } from '@nestjs/schedule';
import { McpModule, McpTransportType } from '@rekog/mcp-nest';
import { join } from 'node:path';
import { AlertModule } from './alert/alert.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { PrismaClientExceptionFilter } from './common/filters/prisma-client-exception.filter';
import { validate } from './config/env.validation';
import { createLoaders } from './dataloader/loaders';
import { EmulatorModule } from './emulator/emulator.module';
import { GroupModule } from './group/group.module';
import { AlertTools } from './mcp/tools/alert.tools';
import { DataTools } from './mcp/tools/data.tools';
import { EmulatorTools } from './mcp/tools/emulator.tools';
import { GroupTools } from './mcp/tools/group.tools';
import { SensorTypeTools } from './mcp/tools/sensor-type.tools';
import { SensorTools } from './mcp/tools/sensor.tools';
import { ExtendedPrismaClient, PRISMA_CLIENT } from './prisma/prisma-client';
import { PrismaModule } from './prisma/prisma.module';
import { PubSubModule } from './pubsub/pubsub.module';
import { ReadingModule } from './reading/reading.module';
import { SensorModule } from './sensor/sensor.module';
import { TimescaleAdminModule } from './timescale-admin/timescale-admin.module';

// The /mcp endpoint has no auth and exposes mutating tools, so expose it only in
// development or when explicitly enabled (MCP_ENABLED=true) — never in prod by
// default. Gate both the transport and the @Tool providers.
const MCP_ENABLED =
  process.env.MCP_ENABLED === 'true' || process.env.NODE_ENV !== 'production';

const MCP_TOOLS = [
  SensorTools,
  SensorTypeTools,
  GroupTools,
  AlertTools,
  EmulatorTools,
  DataTools,
];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    PrismaModule,
    PubSubModule,
    ScheduleModule.forRoot(),
    // Streamable HTTP only (at /mcp) — this is a long-running HTTP server, so we
    // don't want mcp-nest's default STDIO transport reading stdin.
    ...(MCP_ENABLED
      ? [
          McpModule.forRoot({
            name: 'sentinel-mcp',
            version: '0.1.0',
            transport: McpTransportType.STREAMABLE_HTTP,
          }),
        ]
      : []),
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      inject: [PRISMA_CLIENT],
      useFactory: (prisma: ExtendedPrismaClient) => ({
        autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
        sortSchema: true,
        // Live data over WebSocket (graphql-ws).
        subscriptions: { 'graphql-ws': true },
        // Fresh DataLoaders per request (they cache only within a request).
        context: () => ({ loaders: createLoaders(prisma) }),
      }),
    }),
    SensorModule,
    ReadingModule,
    AlertModule,
    EmulatorModule,
    GroupModule,
    TimescaleAdminModule,
  ],
  providers: [
    // MCP @Tool providers — mcp-nest discovers them in the module that hosts
    // McpModule.forRoot (here). Each wraps an existing service (DI). Gated with
    // the transport so they aren't registered when MCP is disabled.
    ...(MCP_ENABLED ? MCP_TOOLS : []),
    // Catch-all registered first so the narrower Prisma filter takes precedence.
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_FILTER,
      useClass: PrismaClientExceptionFilter,
    },
  ],
})
export class AppModule {}
