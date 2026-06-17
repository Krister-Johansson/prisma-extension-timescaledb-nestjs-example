import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import {
  HypertableModel,
  HypertableStats,
} from './models/hypertable-stats.model';
import { TimescaleAdminService } from './timescale-admin.service';

@Resolver()
export class TimescaleAdminResolver {
  constructor(private readonly admin: TimescaleAdminService) {}

  @Query(() => HypertableStats)
  hypertableStats(
    @Args('model', { type: () => HypertableModel }) model: HypertableModel,
  ): Promise<HypertableStats> {
    return this.admin.hypertableStats(model);
  }

  @Mutation(() => Boolean)
  addRetentionPolicy(
    @Args('model', { type: () => HypertableModel }) model: HypertableModel,
    @Args('dropAfter') dropAfter: string,
  ): Promise<boolean> {
    return this.admin.addRetentionPolicy(model, dropAfter);
  }

  @Mutation(() => Boolean)
  removeRetentionPolicy(
    @Args('model', { type: () => HypertableModel }) model: HypertableModel,
  ): Promise<boolean> {
    return this.admin.removeRetentionPolicy(model);
  }

  @Mutation(() => Boolean)
  addCompressionPolicy(
    @Args('model', { type: () => HypertableModel }) model: HypertableModel,
    @Args('after') after: string,
    @Args('segmentBy', { type: () => [String], nullable: true })
    segmentBy?: string[],
    @Args('orderBy', { nullable: true }) orderBy?: string,
  ): Promise<boolean> {
    return this.admin.addCompressionPolicy(model, after, segmentBy, orderBy);
  }

  @Mutation(() => Boolean)
  removeCompressionPolicy(
    @Args('model', { type: () => HypertableModel }) model: HypertableModel,
  ): Promise<boolean> {
    return this.admin.removeCompressionPolicy(model);
  }

  @Mutation(() => Boolean)
  setChunkInterval(
    @Args('model', { type: () => HypertableModel }) model: HypertableModel,
    @Args('interval') interval: string,
  ): Promise<boolean> {
    return this.admin.setChunkInterval(model, interval);
  }

  @Mutation(() => Boolean)
  setChunkSkipping(
    @Args('model', { type: () => HypertableModel }) model: HypertableModel,
    @Args('column') column: string,
    @Args('enabled') enabled: boolean,
  ): Promise<boolean> {
    return this.admin.setChunkSkipping(model, column, enabled);
  }

  /** Drops whole chunks older/newer than the given interval(s). Returns dropped chunk names. */
  @Mutation(() => [String])
  dropChunks(
    @Args('model', { type: () => HypertableModel }) model: HypertableModel,
    @Args('olderThan', { nullable: true }) olderThan?: string,
    @Args('newerThan', { nullable: true }) newerThan?: string,
  ): Promise<string[]> {
    return this.admin.dropChunks(model, olderThan, newerThan);
  }
}
