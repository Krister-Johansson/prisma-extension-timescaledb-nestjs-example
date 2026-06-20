import { Global, Module } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';

/** DI token for the shared in-memory PubSub used by GraphQL subscriptions. */
export const PUB_SUB = Symbol('PUB_SUB');

/** Subscription topics. */
export const TOPICS = {
  readingIngested: 'readingIngested',
  alertFired: 'alertFired',
  anomalyDetected: 'anomalyDetected',
} as const;

/**
 * Provides a single in-memory PubSub. Fine for a single-instance demo; a
 * multi-instance deployment would swap this for a Redis-backed PubSub.
 */
@Global()
@Module({
  providers: [{ provide: PUB_SUB, useValue: new PubSub() }],
  exports: [PUB_SUB],
})
export class PubSubModule {}
