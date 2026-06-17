import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { type Interval } from 'prisma-extension-timescaledb';
import { assertIntervalArg } from '../common/interval';
import { PRISMA_CLIENT } from '../prisma/prisma-client';
import type { ExtendedPrismaClient } from '../prisma/prisma-client';
import {
  HypertableModel,
  HypertableStats,
} from './models/hypertable-stats.model';

@Injectable()
export class TimescaleAdminService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: ExtendedPrismaClient,
  ) {}

  private get ts() {
    return this.prisma.$timescale;
  }

  async hypertableStats(model: HypertableModel): Promise<HypertableStats> {
    const [size, rowCount, compression] = await Promise.all([
      this.ts.hypertableDetailedSize(model),
      this.ts.approximateRowCount(model),
      this.ts.compressionStats(model),
    ]);

    const toNumber = (value: bigint | null): number | null =>
      value === null ? null : Number(value);

    return {
      totalBytes: Number(size.totalBytes),
      tableBytes: Number(size.tableBytes),
      indexBytes: Number(size.indexBytes),
      toastBytes: Number(size.toastBytes),
      approximateRowCount: Number(rowCount),
      totalChunks: Number(compression.totalChunks),
      compressedChunks: Number(compression.compressedChunks),
      beforeCompressionBytes: toNumber(compression.beforeTotalBytes),
      afterCompressionBytes: toNumber(compression.afterTotalBytes),
    };
  }

  async addRetentionPolicy(
    model: HypertableModel,
    dropAfter: string,
  ): Promise<boolean> {
    assertIntervalArg(dropAfter);
    await this.ts.addRetentionPolicy(model, { dropAfter });
    return true;
  }

  async removeRetentionPolicy(model: HypertableModel): Promise<boolean> {
    await this.ts.removeRetentionPolicy(model);
    return true;
  }

  async addCompressionPolicy(
    model: HypertableModel,
    after: string,
    segmentBy?: string[],
    orderBy?: string,
  ): Promise<boolean> {
    assertIntervalArg(after);
    await this.ts.addCompressionPolicy(model, { after, segmentBy, orderBy });
    return true;
  }

  async removeCompressionPolicy(model: HypertableModel): Promise<boolean> {
    await this.ts.removeCompressionPolicy(model);
    return true;
  }

  async setChunkInterval(
    model: HypertableModel,
    interval: string,
  ): Promise<boolean> {
    assertIntervalArg(interval);
    await this.ts.setChunkInterval(model, interval);
    return true;
  }

  async setChunkSkipping(
    model: HypertableModel,
    column: string,
    enabled: boolean,
  ): Promise<boolean> {
    if (enabled) {
      await this.ts.enableChunkSkipping(model, column);
    } else {
      await this.ts.disableChunkSkipping(model, column);
    }
    return true;
  }

  async dropChunks(
    model: HypertableModel,
    olderThan?: string,
    newerThan?: string,
  ): Promise<string[]> {
    if (!olderThan && !newerThan) {
      throw new BadRequestException(
        'Provide olderThan and/or newerThan to bound which chunks to drop.',
      );
    }
    const options: { olderThan?: Interval; newerThan?: Interval } = {};
    if (olderThan) {
      assertIntervalArg(olderThan);
      options.olderThan = olderThan;
    }
    if (newerThan) {
      assertIntervalArg(newerThan);
      options.newerThan = newerThan;
    }
    return this.ts.dropChunks(model, options);
  }
}
