import { Check, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { GenStep } from './use-generate-dashboard';

interface Props {
  open: boolean;
  prompt: string;
  steps: GenStep[];
  summary: string;
  isLoading: boolean;
  error?: Error;
  started: boolean;
  /** Abort an in-flight run. */
  onStop: () => void;
  onClose: () => void;
}

/** Presentational progress view for a generation run. Stateless — the empty
 * state owns the run (via useGenerateDashboard) and starts it from the click
 * handler, so there's no event logic in this component. On success the parent
 * refetches and unmounts this; the close button is for the error / no-op case. */
export function DashboardGenerateDialog({
  open,
  prompt,
  steps,
  summary,
  isLoading,
  error,
  started,
  onStop,
  onClose,
}: Props) {
  if (!open) return null;
  const done = started && !isLoading;

  const handleClose = () => {
    if (isLoading) onStop();
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-1.5">
            <Sparkles className="size-4 text-primary" />
            {done && !error ? 'Dashboard ready' : 'Generating dashboard'}
          </DialogTitle>
          <DialogDescription className="line-clamp-2">
            “{prompt}”
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5 py-1">
          {steps.map((s) => (
            <div key={s.id} className="flex items-center gap-2 text-[13px]">
              {s.done ? (
                <Check className="size-3.5 shrink-0 text-primary" />
              ) : (
                <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-2" />
              )}
              <span className="truncate">{s.label}</span>
            </div>
          ))}
          {steps.length === 0 && isLoading && (
            <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Planning the dashboard…
            </div>
          )}
          {done && !error && summary && (
            <p className="pt-1 text-[12.5px] text-muted-foreground">{summary}</p>
          )}
          {done && !error && steps.length === 0 && (
            <p className="text-[13px] text-muted-foreground">
              No widgets were generated. Try rephrasing your request.
            </p>
          )}
          {error && (
            <p className="text-[12.5px] text-alert">
              Generation failed: {error.message}
            </p>
          )}
        </div>

        <DialogFooter>
          {isLoading ? (
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          ) : (
            <Button onClick={onClose}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
