import { Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DashboardGenerateDialog } from './dashboard-generate-dialog';
import { useGenerateDashboard } from './use-generate-dashboard';

const EXAMPLES = [
  'Three stats for the Bedroom: current, min and max temperature over the last hour',
  'A whole-house overview: temperature and humidity charts plus a gauge for the current temperature',
  'Show the current temperature for every room as gauges',
];

interface Props {
  dashboardId: string;
  /** Refetch the dashboard once widgets have been generated. */
  onGenerated: () => void;
}

/** Empty-dashboard state: describe the dashboard in natural language and let the
 * AI build the widgets. (Manual widgets are still available via the toolbar.)
 * Keyed by dashboard id in the parent so the run is bound to the active tab. */
export function DashboardGenerateEmpty({ dashboardId, onGenerated }: Props) {
  // onGenerated runs on clean completion (the lib's onFinish) — see the hook.
  const gen = useGenerateDashboard(dashboardId, onGenerated);
  const [input, setInput] = useState('');
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');

  const submit = () => {
    const t = input.trim();
    if (!t || gen.isLoading) return;
    setPrompt(t);
    setOpen(true);
    gen.start(t);
  };

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-4 rounded-[14px] border border-dashed border-border px-4 py-14 text-center">
      <div className="flex size-11 items-center justify-center rounded-full bg-primary/10">
        <Sparkles className="size-5 text-primary" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">Generate this dashboard with AI</p>
        <p className="text-[12.5px] text-muted-foreground">
          Describe what you want to see and the assistant builds the widgets.
        </p>
      </div>

      <div className="w-full space-y-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (
              e.key === 'Enter' &&
              (e.metaKey || e.ctrlKey) &&
              !e.nativeEvent.isComposing
            ) {
              e.preventDefault();
              submit();
            }
          }}
          rows={3}
          aria-label="Describe the dashboard"
          placeholder="e.g. Three temperature stats for the Bedroom — current, min and max over the last hour"
          className="w-full resize-none rounded-md border border-border bg-card px-3 py-2 text-left text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Button className="w-full" disabled={!input.trim()} onClick={submit}>
          <Sparkles className="size-4" /> Generate dashboard
        </Button>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] uppercase tracking-wide text-muted-2">
          Try
        </span>
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => setInput(ex)}
            className="rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-left text-[12px] text-muted-foreground hover:bg-card"
          >
            {ex}
          </button>
        ))}
      </div>

      <DashboardGenerateDialog
        open={open}
        prompt={prompt}
        steps={gen.steps}
        summary={gen.summary}
        isLoading={gen.isLoading}
        error={gen.error}
        started={gen.started}
        onStop={gen.stop}
        onClose={() => {
          setOpen(false);
          setInput('');
        }}
      />
    </div>
  );
}
