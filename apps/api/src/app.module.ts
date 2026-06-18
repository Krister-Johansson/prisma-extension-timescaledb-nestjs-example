import { join } from 'node:path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { GraphQLModule } from '@nestjs/graphql';
import { ScheduleModule } from '@nestjs/schedule';
import { McpModule, McpTransportType } from '@rekog/mcp-nest';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { PrismaClientExceptionFilter } from './common/filters/prisma-client-exception.filter';
import { validate } from './config/env.validation';
import { createLoaders } from './dataloader/loaders';
import { ExtendedPrismaClient, PRISMA_CLIENT } from './prisma/prisma-client';
import { PrismaModule } from './prisma/prisma.module';
import { PubSubModule } from './pubsub/pubsub.module';
import { SensorModule } from './sensor/sensor.module';
import { ReadingModule } from './reading/reading.module';
import { AlertModule } from './alert/alert.module';
import { EmulatorModule } from './emulator/emulator.module';
import { GroupModule } from './group/group.module';
import { AlertTools } from './mcp/tools/alert.tools';
import { DataTools } from './mcp/tools/data.tools';
import { EmulatorTools } from './mcp/tools/emulator.tools';
import { GroupTools } from './mcp/tools/group.tools';
import { SensorTools } from './mcp/tools/sensor.tools';
import { SensorTypeTools } from './mcp/tools/sensor-type.tools';
import { TimescaleAdminModule } from './timescale-admin/timescale-admin.module';

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
    McpModule.forRoot({
      name: 'sentinel-mcp',
      version: '0.1.0',
      transport: McpTransportType.STREAMABLE_HTTP,
    }),
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
  controllers: [AppController],
  providers: [
    AppService,
    // MCP @Tool providers — mcp-nest discovers them in the module that hosts
    // McpModule.forRoot (here). Each wraps an existing service (DI).
    SensorTools,
    SensorTypeTools,
    GroupTools,
    AlertTools,
    EmulatorTools,
    DataTools,
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
