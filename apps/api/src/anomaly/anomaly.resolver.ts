import { Inject } from '@nestjs/common';
import {
  Args,
  GraphQLISODateTime,
  ID,
  Int,
  Mutation,
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

  /** Dismiss (acknowledged=true, default) or restore (false) an anomaly. */
  @Mutation(() => Anomaly)
  acknowledgeAnomaly(
    @Args('id', { type: () => ID }) id: string,
    @Args('acknowledged', {
      type: () => Boolean,
      nullable: true,
      defaultValue: true,
    })
    acknowledged: boolean,
  ): Promise<Anomaly> {
    return this.anomalyService.acknowledge(id, acknowledged);
  }

  /** Dismiss every open anomaly at once; returns how many were cleared. */
  @Mutation(() => Int)
  acknowledgeAllAnomalies(): Promise<number> {
    return this.anomalyService.acknowledgeAll();
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
