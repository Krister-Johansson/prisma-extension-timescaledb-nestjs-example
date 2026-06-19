/**
 * `@tanstack/ai` and `@tanstack/ai-openrouter` are ESM-only, but Nest compiles
 * to CommonJS — a normal `import()` would be down-levelled to `require()` and
 * fail. `esmImport` is a real dynamic import that survives the CJS transform.
 * The modules are loaded once and cached.
 */

// eslint-disable-next-line @typescript-eslint/no-implied-eval
const esmImport = new Function('s', 'return import(s)') as <T = unknown>(
  specifier: string,
) => Promise<T>;

/** The subset of the TanStack AI surface we use (loosely typed — ESM/CJS bridge). */
export interface TanstackAi {
  chat: (opts: Record<string, unknown>) => AsyncIterable<AiChunk>;
  toServerSentEventsResponse: (
    stream: AsyncIterable<AiChunk>,
    init?: unknown,
  ) => Response;
  toolDefinition: (config: unknown) => {
    server: (fn: (input: never) => unknown) => unknown;
  };
  chatParamsFromRequestBody: (body: unknown) => Promise<ChatParams>;
}

export interface OpenRouterAi {
  openRouterText: (model: string, config?: unknown) => unknown;
}

export interface ChatParams {
  messages: unknown[];
  threadId?: string;
  tools?: unknown[];
  forwardedProps?: Record<string, unknown>;
}

/** AG-UI stream chunk — `type` is the event name; payload fields vary. */
export interface AiChunk {
  type: string;
  [key: string]: unknown;
}

let cached: Promise<{ ai: TanstackAi; or: OpenRouterAi }> | undefined;

export function loadAi(): Promise<{ ai: TanstackAi; or: OpenRouterAi }> {
  cached ??= (async () => {
    const ai = await esmImport<TanstackAi>('@tanstack/ai');
    const or = await esmImport<OpenRouterAi>('@tanstack/ai-openrouter');
    return { ai, or };
  })();
  return cached;
}
