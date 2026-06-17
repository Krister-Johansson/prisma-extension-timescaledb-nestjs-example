import { Args, ID, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AlertService } from './alert.service';
import { SetAlertRuleInput } from './dto/set-alert-rule.input';
import { AlertEvent } from './models/alert-event.model';
import { AlertRule } from './models/alert-rule.model';

@Resolver(() => AlertRule)
export class AlertResolver {
  constructor(private readonly alertService: AlertService) {}

  @Mutation(() => AlertRule)
  setAlertRule(@Args('input') input: SetAlertRuleInput): Promise<AlertRule> {
    return this.alertService.setRule(input);
  }

  @Query(() => AlertRule, { nullable: true })
  alertRule(
    @Args('sensorId', { type: () => ID }) sensorId: string,
  ): Promise<AlertRule | null> {
    return this.alertService.ruleFor(sensorId);
  }

  @Query(() => [AlertEvent])
  alertEvents(
    @Args('sensorId', { type: () => ID, nullable: true }) sensorId?: string,
    @Args('take', { type: () => Int, nullable: true }) take?: number,
  ): Promise<AlertEvent[]> {
    return this.alertService.events(sensorId, take);
  }
}
