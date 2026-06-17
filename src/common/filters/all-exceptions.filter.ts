import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables, NodeEnv } from '../../config/env.validation';

export interface ErrorResponseBody {
  statusCode: number;
  timestamp: string;
  path: string;
  message: string | object;
}

/**
 * Catch-all global exception filter. Produces a consistent error envelope for
 * any unhandled exception and logs server (5xx) errors.
 *
 * Registered first via APP_FILTER so more specific filters (e.g. the Prisma
 * filter) take precedence by virtue of their narrower `@Catch(...)` target.
 *
 * GraphQL-context awareness is layered on when the GraphQL module is added.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    // `httpAdapter` is resolved here (not in the constructor) because it may not
    // be available at construction time.
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();

    const httpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const isServerError = httpStatus >= 500;
    if (isServerError) {
      this.logger.error(
        exception instanceof Error
          ? (exception.stack ?? exception.message)
          : String(exception),
      );
    }

    const responseBody: ErrorResponseBody = {
      statusCode: httpStatus,
      timestamp: new Date().toISOString(),
      path: httpAdapter.getRequestUrl(ctx.getRequest()) as string,
      message: this.resolveMessage(exception, isServerError),
    };

    httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
  }

  /**
   * 4xx responses pass through their (client-facing) payload. 5xx responses are
   * masked with a generic message in production to avoid leaking internals — but
   * in development we surface the real error to make debugging easier.
   */
  private resolveMessage(
    exception: unknown,
    isServerError: boolean,
  ): string | object {
    if (!isServerError) {
      return exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';
    }

    const isDev =
      this.config.get('NODE_ENV', { infer: true }) === NodeEnv.Development;
    if (!isDev) {
      return 'Internal server error';
    }

    if (exception instanceof HttpException) {
      return exception.getResponse();
    }
    if (exception instanceof Error) {
      return { error: exception.message, stack: exception.stack };
    }
    return String(exception);
  }
}
