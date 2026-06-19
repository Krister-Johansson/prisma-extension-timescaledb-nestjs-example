import { fetchServerSentEvents, useChat } from '@tanstack/ai-react';
import { useMemo, useRef } from 'react';
import type { Part } from '@/components/ai-chat/message-parts';
import { WIDGET_TYPES } from './widget-meta';

const TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

/** One generated widget, surfaced as a progress line in the loading dialog. */
export interface GenStep {
  id: string;
  label: string;
  done: boolean;
}

interface UIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  parts: Part[];
}

/** Pull `{ type, title }` off an add_widget tool-call — from its result once it
 * lands, else from the streaming arguments so the line shows as it's built. */
function describe(part: Part): { type?: string; title?: string } {
  const out = part.output as
    | { type?: string; title?: string | null }
    | undefined;
  if (out?.type) return { type: out.type, title: out.title ?? undefined };
  try {
    const args = JSON.parse((part.arguments as string | undefined) ?? '{}');
    return { type: args.type, title: args.config?.title };
  } catch {
    return {};
  }
}

function stepLabel(part: Part): string {
  const { type, title } = describe(part);
  const typeLabel = type ? (WIDGET_TYPES[type]?.label ?? type) : 'Widget';
  return title ? `${typeLabel} · ${title}` : typeLabel;
}

/**
 * Drives the AI dashboard generator over the agent's SSE transport. Sends the
 * prompt once via `start`, then surfaces each `add_widget` tool-call as a
 * progress step. Remount (key) per dashboard so `dashboardId` stays bound.
 *
 * `onFinish` fires once when a run completes cleanly (a cancel triggers the
 * lib's onAbort, an error its onError — neither calls onFinish), so the caller
 * can refetch without watching loading state from an effect.
 */
export function useGenerateDashboard(dashboardId: string, onFinish?: () => void) {
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  const chat = useChat({
    connection: fetchServerSentEvents('/agent/generate-dashboard'),
    forwardedProps: { timezone: TIMEZONE, dashboardId },
    onFinish: () => onFinishRef.current?.(),
  });
  const messages = chat.messages as unknown as UIMessage[];

  const steps = useMemo<GenStep[]>(() => {
    const out: GenStep[] = [];
    for (const m of messages) {
      if (m.role !== 'assistant') continue;
      for (const part of m.parts) {
        if (part.type === 'tool-call' && part.name === 'add_widget') {
          out.push({
            id: (part.id as string) ?? `${out.length}`,
            label: stepLabel(part),
            done: part.output != null,
          });
        }
      }
    }
    return out;
  }, [messages]);

  // The assistant's closing one-liner (text parts), if it has finished writing.
  const summary = useMemo(() => {
    const last = [...messages].reverse().find((m) => m.role === 'assistant');
    return (last?.parts ?? [])
      .filter((p) => p.type === 'text')
      .map((p) => p.content ?? '')
      .join('')
      .trim();
  }, [messages]);

  return {
    start: (prompt: string) => void chat.sendMessage(prompt),
    stop: () => chat.stop(),
    steps,
    summary,
    isLoading: chat.isLoading,
    error: chat.error ?? undefined,
    started: messages.length > 0,
  };
}
