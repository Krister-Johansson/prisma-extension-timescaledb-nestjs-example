import { Inject, Injectable } from '@nestjs/common';
import { PRISMA_CLIENT } from '../prisma/prisma-client';
import type { ExtendedPrismaClient } from '../prisma/prisma-client';
import { CreateSensorInput } from './dto/create-sensor.input';
import { SensorWhereInput } from './dto/sensor-where.input';

@Injectable()
export class SensorService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: ExtendedPrismaClient,
  ) {}

  findMany(where?: SensorWhereInput) {
    return this.prisma.sensor.findMany({
      where: {
        type: where?.type,
        name: where?.nameContains
          ? { contains: where.nameContains, mode: 'insensitive' }
          : undefined,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.sensor.findUnique({ where: { id } });
  }

  create(input: CreateSensorInput) {
    return this.prisma.sensor.create({ data: input });
  }
}
