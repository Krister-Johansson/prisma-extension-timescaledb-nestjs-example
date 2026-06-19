import { ChevronRight, Wrench } from 'lucide-react';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';

/** A TanStack AI UIMessage part (loosely typed — the lib's union). */
export interface Part {
  type: string;
  content?: string;
  name?: string;
  state?: string;
  [key: string]: unknown;
}

const TOOL_LABEL: Record<string, string> = {
  get_current_time: 'Checked the time',
  list_catalog: 'Looked up the catalog',
  get_latest: 'Read the latest values',
  query_aggregate: 'Aggregated readings',
  query_series: 'Queried a time series',
  compare: 'Compared series',
  active_alerts: 'Checked alerts',
  system_stats: 'Read system stats',
};

function ThinkingDisclosure({ content }: { content: string }) {
  const [open, setOpen] = useState(false);
  if (!content.trim()) return null;
  return (
    <div className="text-[11.5px] text-muted-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 hover:text-muted-foreground"
      >
        <ChevronRight
          className={`size-3 transition-transform ${open ? 'rotate-90' : ''}`}
        />
        Thinking
      </button>
      {open && (
        <div className="mt-1 whitespace-pre-wrap border-l border-border pl-2 italic">
          {content}
        </div>
      )}
    </div>
  );
}

function ToolStatus({ name, state }: { name?: string; state?: string }) {
  // Only show once the call is in flight / done — skip the noisy streaming states.
  if (state === 'input-streaming' || state === 'awaiting-input') return null;
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2 py-0.5 text-[11px] text-muted-foreground">
      <Wrench className="size-3" />
      {TOOL_LABEL[name ?? ''] ?? name}
    </div>
  );
}

/** Render one message part. Charts/cards for tool-result land in Phase 3 — for
 * now a tool result is invisible (the assistant's text summarises it). */
export function MessagePart({ part }: { part: Part }) {
  if (part.type === 'text' && part.content) {
    return (
      <div className="text-[13px] leading-relaxed [&_a]:underline [&_code]:rounded [&_code]:bg-surface-2 [&_code]:px-1 [&_li]:ml-4 [&_li]:list-disc [&_strong]:font-semibold [&_table]:my-1 [&_td]:pr-3 [&_th]:pr-3 [&_th]:text-left">
        <ReactMarkdown>{part.content}</ReactMarkdown>
      </div>
    );
  }
  if (part.type === 'thinking') {
    return <ThinkingDisclosure content={part.content ?? ''} />;
  }
  if (part.type === 'tool-call') {
    return <ToolStatus name={part.name} state={part.state} />;
  }
  return null;
}
