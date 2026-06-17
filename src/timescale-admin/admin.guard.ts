import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GqlExecutionContext } from '@nestjs/graphql';
import { EnvironmentVariables, NodeEnv } from '../config/env.validation';

interface RequestLike {
  headers?: Record<string, string | string[] | undefined>;
}

/**
 * Guards the destructive Timescale admin operations. Requires an `x-admin-token`
 * header equal to `ADMIN_TOKEN`. When `ADMIN_TOKEN` is unset the admin API is
 * left open in development (so the demo works out of the box) but denied in
 * production — a safe default rather than silently public.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  private readonly logger = new Logger(AdminGuard.name);

  constructor(
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.get('ADMIN_TOKEN', { infer: true });

    if (!expected) {
      const isProd =
        this.config.get('NODE_ENV', { infer: true }) === NodeEnv.Production;
      if (isProd) {
        throw new ForbiddenException(
          'Timescale admin API is disabled. Set ADMIN_TOKEN to enable it.',
        );
      }
      this.logger.warn(
        'ADMIN_TOKEN is not set — Timescale admin API is OPEN (development only).',
      );
      return true;
    }

    const req = GqlExecutionContext.create(context).getContext<{
      req?: RequestLike;
    }>().req;
    const provided = req?.headers?.['x-admin-token'];
    if (provided !== expected) {
      throw new ForbiddenException('Invalid or missing x-admin-token header.');
    }
    return true;
  }
}
