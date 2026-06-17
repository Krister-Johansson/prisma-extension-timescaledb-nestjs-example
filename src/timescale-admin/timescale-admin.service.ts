import { Inject, Injectable } from '@nestjs/common';
import { PRISMA_CLIENT } from '../prisma/prisma-client';
import type { ExtendedPrismaClient } from '../prisma/prisma-client';
import {
  HypertableModel,
  HypertableStats,
} from './models/hypertable-stats.model';

/**
 * Read-only introspection over a hypertable. Policy *configuration* (retention,
 * compression, chunk interval, chunk skipping) is declared in `schema.prisma`
 * and applied by migrations — it deliberately isn't mutated at runtime here.
 */
@Injectable()
export class TimescaleAdminService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: ExtendedPrismaClient,
  ) {}

  async hypertableStats(model: HypertableModel): Promise<HypertableStats> {
    const [size, rowCount, compression] = await Promise.all([
      this.prisma.$timescale.hypertableDetailedSize(model),
      this.prisma.$timescale.approximateRowCount(model),
      this.prisma.$timescale.compressionStats(model),
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
}
