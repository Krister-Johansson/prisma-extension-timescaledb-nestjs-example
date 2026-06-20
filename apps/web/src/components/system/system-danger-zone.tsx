import { useMutation } from '@apollo/client/react';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  HypertableStatsDocument,
  PurgeReadingsDocument,
} from '@/graphql/system.generated';

/** Dev-only: wipe all readings + alert events so the demo can start fresh.
 * Mounted behind `import.meta.env.DEV`; the API also rejects it in production. */
export function SystemDangerZone() {
  const [open, setOpen] = useState(false);
  const [purge, { loading }] = useMutation(PurgeReadingsDocument, {
    refetchQueries: [
      { query: HypertableStatsDocument, variables: { model: 'SensorReading' } },
    ],
  });

  return (
    <div className="rounded-[14px] border border-destructive/40 bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-destructive">
            Danger zone · dev only
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Delete every sensor reading and alert event. Sensors, groups and
            dashboards are kept — re-seed (<code>npm run db:seed</code>) to
            restore the demo data.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 gap-1.5 border-destructive/50 text-destructive hover:bg-destructive/10"
          onClick={() => setOpen(true)}
        >
          <Trash2 className="size-3.5" />
          Delete all data
        </Button>
      </div>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all data?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes every reading and alert event. It can’t be
              undone — re-seed with <code>npm run db:seed</code> to restore the
              demo data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={loading}
              onClick={() => void purge()}
            >
              {loading ? 'Deleting…' : 'Delete all data'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
