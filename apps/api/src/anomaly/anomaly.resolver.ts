import { Inject } from '@nestjs/common';
import {
  Args,
  GraphQLISODateTime,
  ID,
  Int,
  Query,
  Resolver,
  Subscription,
} from '@nestjs/graphql';
import { PubSub } from 'graphql-subscriptions';
import { PUB_SUB, TOPICS } from '../pubsub/pubsub.module';
import { AnomalyService } from './anomaly.service';
import { Anomaly } from './models/anomaly.model';

@Resolver(() => Anomaly)
export class AnomalyResolver {
  constructor(
    private readonly anomalyService: AnomalyService,
    @Inject(PUB_SUB) private readonly pubSub: PubSub,
  ) {}

  @Query(() => [Anomaly])
  anomalies(
    @Args('sensorId', { type: () => ID, nullable: true }) sensorId?: string,
    @Args('take', { type: () => Int, nullable: true }) take?: number,
    @Args('start', { type: () => GraphQLISODateTime, nullable: true })
    start?: Date,
    @Args('end', { type: () => GraphQLISODateTime, nullable: true })
    end?: Date,
  ): Promise<Anomaly[]> {
    return this.anomalyService.list(sensorId, take, start, end);
  }

  /** Live stream of detected anomalies, optionally filtered by sensor. */
  @Subscription(() => Anomaly, {
    filter: (
      payload: { anomalyDetected: Anomaly },
      variables: { sensorId?: string },
    ) =>
      !variables.sensorId ||
      payload.anomalyDetected.sensorId === variables.sensorId,
  })
  anomalyDetected(
    @Args('sensorId', { type: () => ID, nullable: true }) _sensorId?: string,
  ) {
    return this.pubSub.asyncIterableIterator(TOPICS.anomalyDetected);
  }
}
