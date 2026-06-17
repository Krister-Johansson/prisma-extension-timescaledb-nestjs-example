import {
  Global,
  Inject,
  Module,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from '../config/env.validation';
import { createPrismaClient, PRISMA_CLIENT } from './prisma-client';
import type { ExtendedPrismaClient } from './prisma-client';

/**
 * Global module exposing the extended Prisma client under the PRISMA_CLIENT
 * token. Connects on bootstrap and disconnects on shutdown (works with the
 * `enableShutdownHooks()` call in main.ts).
 */
@Global()
@Module({
  providers: [
    {
      provide: PRISMA_CLIENT,
      inject: [ConfigService],
      useFactory: (
        config: ConfigService<EnvironmentVariables, true>,
      ): ExtendedPrismaClient =>
        createPrismaClient(config.get('DATABASE_URL', { infer: true })),
    },
  ],
  exports: [PRISMA_CLIENT],
})
export class PrismaModule implements OnModuleInit, OnModuleDestroy {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: ExtendedPrismaClient,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.prisma.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
