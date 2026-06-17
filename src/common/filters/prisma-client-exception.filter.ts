import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { GqlContextType } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';
import { Prisma } from '../../generated/prisma/client.js';
import { ErrorResponseBody, toGraphQLError } from './all-exceptions.filter';

/**
 * Maps Prisma known-request errors to sensible responses using the same envelope
 * as {@link AllExceptionsFilter}. Registered after the catch-all so its narrower
 * `@Catch(...)` target takes precedence for Prisma errors. Context-aware: HTTP
 * envelope for REST, GraphQLError for GraphQL.
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaClientExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaClientExceptionFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(
    exception: Prisma.PrismaClientKnownRequestError,
    host: ArgumentsHost,
  ): void | GraphQLError {
    const { status, message } = this.map(exception);

    if (status >= 500) {
      this.logger.error(`Prisma ${exception.code}: ${exception.message}`);
    }

    if (host.getType<GqlContextType>() === 'graphql') {
      return toGraphQLError(status, message);
    }

    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const responseBody: ErrorResponseBody = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: httpAdapter.getRequestUrl(ctx.getRequest()) as string,
      message,
    };

    httpAdapter.reply(ctx.getResponse(), responseBody, status);
  }

  private map(exception: Prisma.PrismaClientKnownRequestError): {
    status: number;
    message: string;
  } {
    switch (exception.code) {
      case 'P2002': {
        const target = exception.meta?.target;
        const fields = Array.isArray(target)
          ? target.join(', ')
          : typeof target === 'string'
            ? target
            : undefined;
        return {
          status: HttpStatus.CONFLICT,
          message: fields
            ? `Unique constraint failed on: ${fields}`
            : 'Unique constraint failed',
        };
      }
      case 'P2025':
        return { status: HttpStatus.NOT_FOUND, message: 'Record not found' };
      case 'P2003':
        return {
          status: HttpStatus.CONFLICT,
          message: 'Foreign key constraint failed',
        };
      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Database error',
        };
    }
  }
}
