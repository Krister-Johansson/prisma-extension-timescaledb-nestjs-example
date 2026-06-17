import {
  ArgumentsHost,
  BadRequestException,
  HttpStatus,
  InternalServerErrorException,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { NodeEnv } from '../../config/env.validation';
import {
  AllExceptionsFilter,
  ErrorResponseBody,
} from './all-exceptions.filter';

type ReplyArgs = [unknown, ErrorResponseBody, number];

describe('AllExceptionsFilter', () => {
  let reply: jest.Mock;
  let getRequestUrl: jest.Mock;

  const host = {
    getType: () => 'http',
    switchToHttp: () => ({
      getRequest: () => ({}),
      getResponse: () => ({}),
    }),
  } as unknown as ArgumentsHost;

  const makeFilter = (nodeEnv: NodeEnv) => {
    const httpAdapterHost = {
      httpAdapter: { reply, getRequestUrl },
    } as unknown as HttpAdapterHost;
    const config = {
      get: jest.fn().mockReturnValue(nodeEnv),
    } as unknown as ConfigService;
    return new AllExceptionsFilter(httpAdapterHost, config);
  };

  beforeEach(() => {
    reply = jest.fn();
    getRequestUrl = jest.fn().mockReturnValue('/test');
  });

  it('maps a 4xx HttpException to its status and message', () => {
    makeFilter(NodeEnv.Production).catch(
      new BadRequestException('bad input'),
      host,
    );

    expect(reply).toHaveBeenCalledTimes(1);
    const [, body, status] = reply.mock.calls[0] as ReplyArgs;
    expect(status).toBe(HttpStatus.BAD_REQUEST);
    expect(body).toMatchObject({
      statusCode: HttpStatus.BAD_REQUEST,
      path: '/test',
    });
    expect(body.message).toMatchObject({ message: 'bad input' });
    expect(body.timestamp).toEqual(expect.any(String));
  });

  it('maps an unknown error to 500 with a generic message', () => {
    makeFilter(NodeEnv.Production).catch(new Error('boom'), host);

    const [, body, status] = reply.mock.calls[0] as ReplyArgs;
    expect(status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(body.message).toBe('Internal server error');
  });

  it('masks a 5xx HttpException message in production', () => {
    makeFilter(NodeEnv.Production).catch(
      new InternalServerErrorException('sensitive detail'),
      host,
    );

    const [, body, status] = reply.mock.calls[0] as ReplyArgs;
    expect(status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(body.message).toBe('Internal server error');
  });

  it('exposes 5xx error details in development', () => {
    makeFilter(NodeEnv.Development).catch(new Error('boom'), host);

    const [, body, status] = reply.mock.calls[0] as ReplyArgs;
    expect(status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(body.message).toMatchObject({ error: 'boom' });
  });

  it('exposes a 5xx HttpException response in development', () => {
    makeFilter(NodeEnv.Development).catch(
      new InternalServerErrorException('sensitive detail'),
      host,
    );

    const [, body, status] = reply.mock.calls[0] as ReplyArgs;
    expect(status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(body.message).toMatchObject({ message: 'sensitive detail' });
  });
});
