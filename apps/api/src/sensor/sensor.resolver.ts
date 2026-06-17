import { NotFoundException } from '@nestjs/common';
import {
  Args,
  Context,
  ID,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import type { GraphQLContext } from '../dataloader/loaders';
import { CreateSensorInput } from './dto/create-sensor.input';
import { SensorWhereInput } from './dto/sensor-where.input';
import { Sensor, SensorReading } from './models/sensor.model';
import { SensorService } from './sensor.service';

@Resolver(() => Sensor)
export class SensorResolver {
  constructor(private readonly sensorService: SensorService) {}

  @Query(() => [Sensor], { name: 'sensors' })
  sensors(
    @Args('where', { nullable: true }) where?: SensorWhereInput,
  ): Promise<Sensor[]> {
    return this.sensorService.findMany(where);
  }

  @Query(() => Sensor, { name: 'sensor' })
  async sensor(@Args('id', { type: () => ID }) id: string): Promise<Sensor> {
    const sensor = await this.sensorService.findOne(id);
    if (!sensor) {
      throw new NotFoundException(`Sensor ${id} not found`);
    }
    return sensor;
  }

  @Mutation(() => Sensor)
  createSensor(@Args('input') input: CreateSensorInput): Promise<Sensor> {
    return this.sensorService.create(input);
  }

  /** Batched via DataLoader — one query for all sensors in the response. */
  @ResolveField(() => [SensorReading])
  readings(
    @Parent() sensor: Sensor,
    @Context() ctx: GraphQLContext,
  ): Promise<SensorReading[]> {
    return ctx.loaders.readingsBySensor.load(sensor.id);
  }
}
