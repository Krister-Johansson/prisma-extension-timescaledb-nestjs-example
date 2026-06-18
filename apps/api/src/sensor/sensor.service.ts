import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { PRISMA_CLIENT } from '../prisma/prisma-client';
import type { ExtendedPrismaClient } from '../prisma/prisma-client';
import { CreateSensorTypeInput } from './dto/create-sensor-type.input';
import { CreateSensorInput } from './dto/create-sensor.input';
import { SensorWhereInput } from './dto/sensor-where.input';
import { UpdateSensorInput } from './dto/update-sensor.input';

@Injectable()
export class SensorService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: ExtendedPrismaClient,
  ) {}

  findMany(where?: SensorWhereInput) {
    return this.prisma.sensor.findMany({
      where: {
        typeKey: where?.typeKey,
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

  /** All measurement types — for the type picker + the types admin. */
  findTypes() {
    return this.prisma.sensorType.findMany({ orderBy: { label: 'asc' } });
  }

  createType(input: CreateSensorTypeInput) {
    return this.prisma.sensorType.create({ data: input });
  }

  update(id: string, input: UpdateSensorInput) {
    if (Object.keys(input).length === 0) {
      throw new BadRequestException('Provide at least one field to update.');
    }
    return this.prisma.sensor.update({ where: { id }, data: input });
  }

  /** Cascades to readings, the alert rule and events (see schema relations). */
  remove(id: string) {
    return this.prisma.sensor.delete({ where: { id } });
  }
}
