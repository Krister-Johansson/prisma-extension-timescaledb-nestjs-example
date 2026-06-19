import { ChevronRight, Wrench } from 'lucide-react';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import {
  RENDERABLE_KINDS,
  ToolResultView,
  type ToolOutput,
} from './tool-result-view';

/** What a pending mutation will do — shown on the Confirm card. */
function describeWrite(name?: string, input?: Record<string, unknown>): string {
  const i = input ?? {};
  const s = (k: string) => String(i[k] ?? '');
  switch (name) {
    case 'create_sensor':
      return `Create sensor “${s('name')}” (${s('typeKey')})`;
    case 'create_group':
      return `Create group “${s('name')}”`;
    case 'rename_group':
      return `Rename a group to “${s('name')}”`;
    case 'move_group':
      return i.parentId ? 'Move a group under a new parent' : 'Move a group to the top level';
    case 'assign_sensor_to_group':
      return i.groupId ? 'Assign a sensor to a group' : 'Remove a sensor from its group';
    case 'create_sensor_type':
      return `Create type “${s('key')}” — ${s('label')} (${s('unit')})`;
    case 'create_emulator':
      return `Create an emulator (${s('min')}–${s('max')}, every ${s('intervalSeconds')}s)`;
    case 'set_emulator_running':
      return i.running ? 'Start an emulator' : 'Stop an emulator';
    default:
      return name ?? 'Make a change';
  }
}

interface Approval {
  id: string;
  needsApproval: boolean;
  approved?: boolean;
}

function ApprovalCard({
  part,
  onApproval,
}: {
  part: Part;
  onApproval?: (id: string, approved: boolean) => void;
}) {
  const approval = part.approval as Approval | undefined;
  const [local, setLocal] = useState<boolean | null>(null);
  if (!approval) return null;
  // The pending args arrive as a JSON string in `arguments` (the parsed `input`
  // isn't populated until after approval).
  let input: Record<string, unknown> = {};
  try {
    input = JSON.parse((part.arguments as string | undefined) ?? '{}');
  } catch {
    input = {};
  }
  const decided = local !== null || approval.approved !== undefined;
  const approved = local ?? approval.approved ?? false;
  const respond = (ok: boolean) => {
    setLocal(ok);
    onApproval?.(approval.id, ok);
  };
  return (
    <div className="rounded-[12px] border border-border bg-card p-3">
      <div className="text-[12.5px] font-medium">
        {describeWrite(part.name, input)}
      </div>
      {decided ? (
        <div
          className={`mt-1.5 text-[11.5px] ${approved ? 'text-primary' : 'text-muted-2'}`}
        >
          {approved ? '✓ Confirmed' : 'Cancelled'}
        </div>
      ) : (
        <div className="mt-2 flex gap-2">
          <Button size="sm" onClick={() => respond(true)}>
            Confirm
          </Button>
          <Button size="sm" variant="outline" onClick={() => respond(false)}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}

/** A TanStack AI UIMessage part (loosely typed — the lib's union). */
export interface Part {
  type: string;
  id?: string;
  content?: string;
  name?: string;
  state?: string;
  /** Raw JSON args string on a pending tool-call (before `input` is parsed). */
  arguments?: string;
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
export function MessagePart({
  part,
  onApproval,
}: {
  part: Part;
  onApproval?: (id: string, approved: boolean) => void;
}) {
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
    // Output present (incl. a 'done' card after a confirmed write) → render it.
    const output = part.output as ToolOutput | undefined;
    if (
      output &&
      typeof output === 'object' &&
      'kind' in output &&
      RENDERABLE_KINDS.has(output.kind)
    ) {
      return <ToolResultView output={output} />;
    }
    // A mutation awaiting (or declined) approval → the Confirm card.
    if (part.approval) {
      return <ApprovalCard part={part} onApproval={onApproval} />;
    }
    return <ToolStatus name={part.name} state={part.state} />;
  }
  return null;
}
