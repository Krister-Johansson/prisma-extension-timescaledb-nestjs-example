import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { PRISMA_CLIENT } from '../prisma/prisma-client';
import type { ExtendedPrismaClient } from '../prisma/prisma-client';
import { SetAlertRuleInput } from './dto/set-alert-rule.input';
import { evaluate, validateBand } from './alert.hysteresis';

@Injectable()
export class AlertService {
  private readonly logger = new Logger(AlertService.name);

  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: ExtendedPrismaClient,
  ) {}

  /** Create or replace the alert rule for a sensor. */
  setRule(input: SetAlertRuleInput) {
    const bandError = validateBand(
      input.direction,
      input.threshold,
      input.clearThreshold,
    );
    if (bandError) {
      throw new BadRequestException(bandError);
    }

    const data = {
      direction: input.direction,
      threshold: input.threshold,
      clearThreshold: input.clearThreshold,
      severity: input.severity,
      enabled: input.enabled,
    };
    return this.prisma.alertRule.upsert({
      where: { sensorId: input.sensorId },
      create: { sensorId: input.sensorId, ...data },
      update: data,
    });
  }

  ruleFor(sensorId: string) {
    return this.prisma.alertRule.findUnique({ where: { sensorId } });
  }

  events(sensorId?: string, take = 50) {
    return this.prisma.alertEvent.findMany({
      where: { sensorId },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  /**
   * Evaluate a freshly ingested reading against the sensor's rule and, on a
   * state transition, persist an AlertEvent + flip the rule state in one
   * transaction. Called from the ingest path.
   */
  async evaluateReading(sensorId: string, value: number): Promise<void> {
    const rule = await this.prisma.alertRule.findUnique({
      where: { sensorId },
    });
    if (!rule || !rule.enabled) {
      return;
    }

    const decision = evaluate(rule, value);
    if (decision.transition === 'NONE') {
      return;
    }

    const raised = decision.transition === 'RAISED';
    const message = `Sensor ${sensorId} alert ${raised ? 'RAISED' : 'CLEARED'}: value ${value} (${rule.direction} threshold ${rule.threshold}, reset ${rule.clearThreshold})`;

    await this.prisma.$transaction([
      this.prisma.alertRule.update({
        where: { sensorId },
        data: {
          state: decision.nextState,
          ...(raised ? { lastFiredAt: new Date() } : {}),
        },
      }),
      this.prisma.alertEvent.create({
        data: { sensorId, kind: decision.transition, value, message },
      }),
    ]);

    if (raised) {
      this.logger.warn(message);
    } else {
      this.logger.log(message);
    }
  }
}
