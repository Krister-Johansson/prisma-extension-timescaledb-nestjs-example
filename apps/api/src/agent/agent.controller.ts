import {
  Body,
  Controller,
  Post,
  Res,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Response } from 'express';
import { Readable } from 'node:stream';
import type { ReadableStream as WebReadableStream } from 'node:stream/web';
import { AgentService } from './agent.service';

/** AI chat endpoint. Streams the AG-UI SSE protocol that the web `useChat`
 * client consumes. No auth — gated to dev/key-present in AppModule. */
@Controller('agent')
export class AgentController {
  constructor(private readonly agent: AgentService) {}

  @Post('chat')
  async chat(@Body() body: unknown, @Res() res: Response): Promise<void> {
    if (!this.agent.enabled) {
      throw new ServiceUnavailableException('AI agent is not configured');
    }
    const response = await this.agent.chat(body);
    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    if (response.body) {
      Readable.fromWeb(response.body as WebReadableStream).pipe(res);
    } else {
      res.end();
    }
  }
}
