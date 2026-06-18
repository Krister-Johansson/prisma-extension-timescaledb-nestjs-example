import { Inject } from '@nestjs/common';
import {
  Args,
  ID,
  Int,
  Mutation,
  Query,
  Resolver,
  Subscription,
} from '@nestjs/graphql';
import { PubSub } from 'graphql-subscriptions';
import { PUB_SUB, TOPICS } from '../pubsub/pubsub.module';
import { AlertService } from './alert.service';
import { SetAlertRuleInput } from './dto/set-alert-rule.input';
import { AlertEvent } from './models/alert-event.model';
import { AlertRule } from './models/alert-rule.model';

@Resolver(() => AlertRule)
export class AlertResolver {
  constructor(
    private readonly alertService: AlertService,
    @Inject(PUB_SUB) private readonly pubSub: PubSub,
  ) {}

  @Mutation(() => AlertRule)
  setAlertRule(@Args('input') input: SetAlertRuleInput): Promise<AlertRule> {
    return this.alertService.setRule(input);
  }

  /** Returns the deleted rule so clients can evict it from their cache. */
  @Mutation(() => AlertRule)
  deleteAlertRule(
    @Args('sensorId', { type: () => ID }) sensorId: string,
  ): Promise<AlertRule> {
    return this.alertService.removeRule(sensorId);
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

  /** Live stream of raised/cleared alerts, optionally filtered by sensor. */
  @Subscription(() => AlertEvent, {
    filter: (
      payload: { alertFired: AlertEvent },
      variables: { sensorId?: string },
    ) =>
      !variables.sensorId || payload.alertFired.sensorId === variables.sensorId,
  })
  alertFired(
    @Args('sensorId', { type: () => ID, nullable: true }) _sensorId?: string,
  ) {
    return this.pubSub.asyncIterableIterator(TOPICS.alertFired);
  }
}
