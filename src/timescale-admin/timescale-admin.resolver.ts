import { Args, Query, Resolver } from '@nestjs/graphql';
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
}
