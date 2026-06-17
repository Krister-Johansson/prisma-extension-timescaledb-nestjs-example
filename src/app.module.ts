import { join } from 'node:path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { GraphQLModule } from '@nestjs/graphql';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { PrismaClientExceptionFilter } from './common/filters/prisma-client-exception.filter';
import { validate } from './config/env.validation';
import { createLoaders } from './dataloader/loaders';
import { ExtendedPrismaClient, PRISMA_CLIENT } from './prisma/prisma-client';
import { PrismaModule } from './prisma/prisma.module';
import { SensorModule } from './sensor/sensor.module';
import { ReadingModule } from './reading/reading.module';
import { AlertModule } from './alert/alert.module';
import { TimescaleAdminModule } from './timescale-admin/timescale-admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    PrismaModule,
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      inject: [PRISMA_CLIENT],
      useFactory: (prisma: ExtendedPrismaClient) => ({
        autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
        sortSchema: true,
        // `req` is exposed so guards can read headers; fresh DataLoaders per
        // request (they cache only within a request).
        context: ({ req }: { req: unknown }) => ({
          req,
          loaders: createLoaders(prisma),
        }),
      }),
    }),
    SensorModule,
    ReadingModule,
    AlertModule,
    TimescaleAdminModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
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
