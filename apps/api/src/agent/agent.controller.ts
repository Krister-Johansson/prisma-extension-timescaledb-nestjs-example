import {
  Body,
  Controller,
  Logger,
  Post,
  Res,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Response } from 'express';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ReadableStream as WebReadableStream } from 'node:stream/web';
import { AgentService } from './agent.service';

/** AI chat endpoint. Streams the AG-UI SSE protocol that the web `useChat`
 * client consumes. No auth — gated to dev/key-present in AppModule. */
@Controller('agent')
export class AgentController {
  private readonly logger = new Logger(AgentController.name);

  constructor(private readonly agent: AgentService) {}

  @Post('chat')
  async chat(@Body() body: unknown, @Res() res: Response): Promise<void> {
    await this.stream(() => this.agent.chat(body), res);
  }

  /** Generate a dashboard's widgets from a prompt (streams progress per widget).
   * `dashboardId` + `timezone` ride along in the request's forwardedProps. */
  @Post('generate-dashboard')
  async generateDashboard(
    @Body() body: unknown,
    @Res() res: Response,
  ): Promise<void> {
    await this.stream(() => this.agent.generateDashboard(body), res);
  }

  /** Pipe an agent SSE Response through Express, gated on the agent being
   * configured. */
  private async stream(
    produce: () => Promise<globalThis.Response>,
    res: Response,
  ): Promise<void> {
    if (!this.agent.enabled) {
      throw new ServiceUnavailableException('AI agent is not configured');
    }
    const response = await produce();
    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    if (!response.body) {
      res.end();
      return;
    }
    try {
      // pipeline awaits completion and tears down both streams on error or
      // client disconnect — a bare .pipe() would leave the request dangling.
      await pipeline(Readable.fromWeb(response.body as WebReadableStream), res);
    } catch (err) {
      this.logger.warn(
        `Agent SSE stream ended early: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      if (!res.writableEnded) res.end();
    }
  }
}
