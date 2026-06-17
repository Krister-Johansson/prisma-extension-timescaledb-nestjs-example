import { ArgumentsHost, BadRequestException, HttpStatus } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import {
  AllExceptionsFilter,
  ErrorResponseBody,
} from './all-exceptions.filter';

type ReplyArgs = [unknown, ErrorResponseBody, number];

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let reply: jest.Mock;
  let getRequestUrl: jest.Mock;

  const host = {
    switchToHttp: () => ({
      getRequest: () => ({}),
      getResponse: () => ({}),
    }),
  } as unknown as ArgumentsHost;

  beforeEach(() => {
    reply = jest.fn();
    getRequestUrl = jest.fn().mockReturnValue('/test');
    const httpAdapterHost = {
      httpAdapter: { reply, getRequestUrl },
    } as unknown as HttpAdapterHost;
    filter = new AllExceptionsFilter(httpAdapterHost);
  });

  it('maps an HttpException to its status and message', () => {
    filter.catch(new BadRequestException('bad input'), host);

    expect(reply).toHaveBeenCalledTimes(1);
    const [, body, status] = reply.mock.calls[0] as ReplyArgs;
    expect(status).toBe(HttpStatus.BAD_REQUEST);
    expect(body).toMatchObject({
      statusCode: HttpStatus.BAD_REQUEST,
      path: '/test',
    });
    expect(body.timestamp).toEqual(expect.any(String));
  });

  it('maps an unknown error to 500 with a generic message', () => {
    filter.catch(new Error('boom'), host);

    const [, body, status] = reply.mock.calls[0] as ReplyArgs;
    expect(status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(body.message).toBe('Internal server error');
  });
});
