import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { AlertDirection } from '../generated/prisma/enums.js';
import { PRISMA_CLIENT } from '../prisma/prisma-client';
import type { ExtendedPrismaClient } from '../prisma/prisma-client';
import { PUB_SUB, TOPICS } from '../pubsub/pubsub.module';
import { CreateAlertRuleInput } from './dto/create-alert-rule.input';
import { UpdateAlertRuleInput } from './dto/update-alert-rule.input';
import { evaluate, validateBand } from './alert.hysteresis';

@Injectable()
export class AlertService {
  private readonly logger = new Logger(AlertService.name);

  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: ExtendedPrismaClient,
    @Inject(PUB_SUB) private readonly pubSub: PubSub,
  ) {}

  /** Create a new alert rule for a sensor (a sensor may have several). */
  createRule(input: CreateAlertRuleInput) {
    this.assertBand(input);
    return this.prisma.alertRule.create({ data: input });
  }

  /** Replace an existing rule's fields. Throws P2025 (→ 404) if missing. */
  updateRule(id: string, input: UpdateAlertRuleInput) {
    this.assertBand(input);
    return this.prisma.alertRule.update({ where: { id }, data: input });
  }

  /** All rules for a sensor, oldest first. */
  rulesFor(sensorId: string) {
    return this.prisma.alertRule.findMany({
      where: { sensorId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /** Delete a rule by id. Throws P2025 (→ 404) if missing. */
  removeRule(id: string) {
    return this.prisma.alertRule.delete({ where: { id } });
  }

  private assertBand(input: {
    direction: AlertDirection;
    threshold: number;
    clearThreshold: number;
  }) {
    const bandError = validateBand(
      input.direction,
      input.threshold,
      input.clearThreshold,
    );
    if (bandError) {
      throw new BadRequestException(bandError);
    }
  }

  events(sensorId?: string, take = 50) {
    // Bound the scan so a single query can't pull unbounded history.
    const safeTake = Math.min(Math.max(take, 1), 200);
    return this.prisma.alertEvent.findMany({
      where: { sensorId },
      orderBy: { createdAt: 'desc' },
      take: safeTake,
    });
  }

  /**
   * Evaluate a freshly ingested reading against every enabled rule on the sensor
   * and, on a state transition, persist an AlertEvent + flip that rule's state in
   * one transaction. Each rule is evaluated independently. Called from ingest.
   */
  async evaluateReading(sensorId: string, value: number): Promise<void> {
    const rules = await this.prisma.alertRule.findMany({
      where: { sensorId, enabled: true },
    });

    for (const rule of rules) {
      const decision = evaluate(rule, value);
      if (decision.transition === 'NONE') {
        continue;
      }

      const raised = decision.transition === 'RAISED';
      const message = `Sensor ${sensorId} alert ${raised ? 'RAISED' : 'CLEARED'}: value ${value} (${rule.direction} threshold ${rule.threshold}, reset ${rule.clearThreshold})`;

      // Compare-and-swap on this rule: only flip it (and record the event) if its
      // state is still what we evaluated against, so concurrent ingests can't both
      // fire the same transition.
      const event = await this.prisma.$transaction(async (tx) => {
        const { count } = await tx.alertRule.updateMany({
          where: { id: rule.id, state: rule.state },
          data: {
            state: decision.nextState,
            ...(raised ? { lastFiredAt: new Date() } : {}),
          },
        });
        if (count === 0) {
          return null; // another ingest already transitioned this rule
        }
        return tx.alertEvent.create({
          data: { sensorId, kind: decision.transition, value, message },
        });
      });

      if (!event) {
        continue;
      }
      if (raised) {
        this.logger.warn(message);
      } else {
        this.logger.log(message);
      }
      await this.pubSub.publish(TOPICS.alertFired, { alertFired: event });
    }
  }
}
