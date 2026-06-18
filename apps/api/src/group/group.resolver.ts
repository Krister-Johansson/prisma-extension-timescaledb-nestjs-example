import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Sensor } from '../sensor/models/sensor.model';
import { GroupService } from './group.service';
import { SensorGroup } from './models/sensor-group.model';

@Resolver(() => SensorGroup)
export class GroupResolver {
  constructor(private readonly groupService: GroupService) {}

  /** All groups (flat) with direct sensor counts; the client builds the tree. */
  @Query(() => [SensorGroup], { name: 'sensorGroups' })
  async sensorGroups(): Promise<SensorGroup[]> {
    const groups = await this.groupService.findMany();
    const counts = await this.groupService.sensorCounts(
      groups.map((g) => g.id),
    );
    return groups.map((g) => ({ ...g, sensorCount: counts.get(g.id) ?? 0 }));
  }

  @Mutation(() => SensorGroup)
  async createSensorGroup(
    @Args('name') name: string,
    @Args('parentId', { type: () => ID, nullable: true }) parentId?: string,
  ): Promise<SensorGroup> {
    return this.withCount(await this.groupService.create(name, parentId));
  }

  @Mutation(() => SensorGroup)
  async renameSensorGroup(
    @Args('id', { type: () => ID }) id: string,
    @Args('name') name: string,
  ): Promise<SensorGroup> {
    return this.withCount(await this.groupService.rename(id, name));
  }

  @Mutation(() => SensorGroup)
  async moveSensorGroup(
    @Args('id', { type: () => ID }) id: string,
    @Args('parentId', { type: () => ID, nullable: true }) parentId?: string,
  ): Promise<SensorGroup> {
    return this.withCount(await this.groupService.move(id, parentId));
  }

  @Mutation(() => Boolean)
  deleteSensorGroup(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<boolean> {
    return this.groupService.remove(id);
  }

  /** Assign a sensor to a group, or pass no `groupId` to ungroup it. */
  @Mutation(() => Sensor)
  assignSensorToGroup(
    @Args('sensorId', { type: () => ID }) sensorId: string,
    @Args('groupId', { type: () => ID, nullable: true }) groupId?: string,
  ): Promise<Sensor> {
    return this.groupService.assignSensor(sensorId, groupId);
  }

  private async withCount(group: {
    id: string;
    name: string;
    parentId: string | null;
    createdAt: Date;
  }): Promise<SensorGroup> {
    const counts = await this.groupService.sensorCounts([group.id]);
    return { ...group, sensorCount: counts.get(group.id) ?? 0 };
  }
}
