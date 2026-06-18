import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { PRISMA_CLIENT } from '../prisma/prisma-client';
import type { ExtendedPrismaClient } from '../prisma/prisma-client';
import { ReadingService } from '../reading/reading.service';
import { CreateEmulatorInput } from './dto/create-emulator.input';
import { nextValue } from './emulator.signal';

/** Resolution of the scheduler; each emulator fires on its own interval. */
const TICK_MS = 1000;

@Injectable()
export class EmulatorService {
  private readonly logger = new Logger(EmulatorService.name);
  /** Guards against overlapping ticks if ingestion is slow. */
  private ticking = false;

  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: ExtendedPrismaClient,
    private readonly readingService: ReadingService,
  ) {}

  list() {
    return this.prisma.emulator.findMany({ orderBy: { createdAt: 'desc' } });
  }

  create(input: CreateEmulatorInput) {
    if (input.min >= input.max) {
      throw new BadRequestException('min must be less than max.');
    }
    return this.prisma.emulator.create({ data: input });
  }

  /** Pause/resume. Throws P2025 (→ 404) if missing. */
  setRunning(id: string, running: boolean) {
    return this.prisma.emulator.update({ where: { id }, data: { running } });
  }

  /** Delete. Throws P2025 (→ 404) if missing. */
  remove(id: string) {
    return this.prisma.emulator.delete({ where: { id } });
  }

  /**
   * Every second, ingest one reading for each running emulator whose interval
   * has elapsed. Values evolve via a bounded mean-reverting walk; ingestion
   * reuses ReadingService so alert evaluation + subscriptions fire as usual.
   */
  @Interval(TICK_MS)
  async tick(): Promise<void> {
    if (this.ticking) return;
    this.ticking = true;
    try {
      const now = Date.now();
      const emulators = await this.prisma.emulator.findMany({
        where: { running: true },
      });

      for (const emulator of emulators) {
        // Fire when at least `intervalSeconds` have elapsed. Allow a half-tick
        // of slack so an interval that's a multiple of TICK_MS isn't pushed a
        // whole cycle late when the scheduler fires marginally early.
        const elapsed = now - (emulator.lastTickAt?.getTime() ?? 0);
        const due =
          !emulator.lastTickAt ||
          elapsed >= emulator.intervalSeconds * 1000 - TICK_MS / 2;
        if (!due) continue;

        const value = nextValue(emulator.min, emulator.max, emulator.lastValue);
        try {
          await this.readingService.ingest({
            sensorId: emulator.sensorId,
            value,
          });
          await this.prisma.emulator.update({
            where: { id: emulator.id },
            data: { lastValue: value, lastTickAt: new Date() },
          });
        } catch (error) {
          this.logger.error(
            `Emulator ${emulator.id} tick failed`,
            error instanceof Error ? error.stack : String(error),
          );
        }
      }
    } finally {
      this.ticking = false;
    }
  }
}
