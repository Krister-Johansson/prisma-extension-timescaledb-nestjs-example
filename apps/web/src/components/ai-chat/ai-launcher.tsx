import { fetchServerSentEvents, useChat } from '@tanstack/ai-react';
import { Loader2, Send, Sparkles, Square, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { MessagePart, type Part } from './message-parts';

const TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

const SUGGESTIONS = [
  'What rooms and sensors do we have?',
  'What is the temperature in the Bedroom right now?',
  'Average temperature in the house over the last hour',
];

interface UIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  parts: Part[];
}

function Conversation() {
  const chat = useChat({
    connection: fetchServerSentEvents('/agent/chat'),
    forwardedProps: { timezone: TIMEZONE },
  });
  const messages = chat.messages as unknown as UIMessage[];
  const { sendMessage, isLoading, stop, error, addToolApprovalResponse } = chat;

  const onApproval = (id: string, approved: boolean) => {
    void addToolApprovalResponse({ id, approved });
  };

  // A tool call can appear in both the pre- and post-approval messages; keep
  // only its final occurrence so its card (and result) renders once.
  const lastToolPos = new Map<string, string>();
  messages.forEach((m, mi) =>
    m.parts.forEach((p, pi) => {
      const id = p.id as string | undefined;
      if (p.type === 'tool-call' && id) lastToolPos.set(id, `${mi}:${pi}`);
    }),
  );

  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Keep the newest message in view as it streams.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const send = (text: string) => {
    const t = text.trim();
    if (!t || isLoading) return;
    setInput('');
    void sendMessage(t);
  };

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3">
        {messages.length === 0 ? (
          <div className="flex flex-col gap-2 pt-2">
            <p className="text-[12.5px] text-muted-foreground">
              Ask about your sensors, groups, and readings.
            </p>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                className="rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-left text-[12.5px] hover:bg-card"
              >
                {s}
              </button>
            ))}
          </div>
        ) : (
          messages.map((m, mi) =>
            m.role === 'user' ? (
              <div key={m.id} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-1.5 text-[13px] text-primary-foreground">
                  {m.parts
                    .filter((p) => p.type === 'text')
                    .map((p) => p.content)
                    .join('')}
                </div>
              </div>
            ) : (
              <div key={m.id} className="flex flex-col gap-1.5">
                {m.parts.map((part, pi) => {
                  const id = part.id as string | undefined;
                  if (
                    part.type === 'tool-call' &&
                    id &&
                    lastToolPos.get(id) !== `${mi}:${pi}`
                  )
                    return null;
                  return (
                    <MessagePart key={pi} part={part} onApproval={onApproval} />
                  );
                })}
              </div>
            ),
          )
        )}
        {isLoading && (
          <div className="inline-flex items-center gap-1.5 text-[12px] text-muted-2">
            <Loader2 className="size-3.5 animate-spin" />
            Thinking…
          </div>
        )}
        {error && (
          <div className="text-[12px] text-alert">
            Something went wrong: {error.message}
          </div>
        )}
      </div>

      <div className="border-t border-border p-2">
        <div className="flex items-end gap-1.5">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              // isComposing: don't submit on the Enter that confirms an IME
              // (CJK) candidate.
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={1}
            placeholder="Ask about your data…"
            className="max-h-28 min-h-9 flex-1 resize-none rounded-md border border-border bg-card px-2.5 py-2 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {isLoading ? (
            <Button
              size="icon-sm"
              variant="outline"
              aria-label="Stop generating"
              onClick={() => stop()}
            >
              <Square className="size-3.5" />
            </Button>
          ) : (
            <Button
              size="icon-sm"
              aria-label="Send message"
              disabled={!input.trim()}
              onClick={() => send(input)}
            >
              <Send className="size-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Floating AI assistant — a bottom-right button that opens a chat panel. */
export function AiLauncher() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && (
        <div className="fixed bottom-20 right-4 z-50 flex h-[min(70vh,560px)] w-[min(92vw,380px)] flex-col overflow-hidden rounded-[16px] border border-border bg-popover shadow-xl">
          <div className="flex items-center justify-between border-b border-border bg-card px-3 py-2">
            <div className="flex items-center gap-1.5 text-sm font-semibold">
              <Sparkles className="size-4 text-primary" />
              Assistant
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Close assistant"
              onClick={() => setOpen(false)}
            >
              <X className="size-4" />
            </Button>
          </div>
          {/* Remount per open so a fresh conversation starts each time. */}
          <Conversation key={open ? 'open' : 'closed'} />
        </div>
      )}

      <Button
        size="icon"
        aria-label={open ? 'Close assistant' : 'Open assistant'}
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-4 right-4 z-50 size-12 rounded-full shadow-lg"
      >
        {open ? <X className="size-5" /> : <Sparkles className="size-5" />}
      </Button>
    </>
  );
}
