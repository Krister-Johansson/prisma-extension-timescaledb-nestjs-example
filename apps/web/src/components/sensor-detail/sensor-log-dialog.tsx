import { useMutation } from '@apollo/client/react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { IngestReadingDocument } from '@/graphql/sensors.generated';

/** Manually record one reading for a sensor (timestamped now). Refetches the
 * active queries so the chart + last value update, and the backend runs alert
 * evaluation + the live subscription as for any ingest. */
export function SensorLogDialog({
  sensorId,
  sensorName,
  unit,
  open,
  onOpenChange,
}: {
  sensorId: string;
  sensorName: string;
  unit: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [value, setValue] = useState('');
  const [ingest, { loading }] = useMutation(IngestReadingDocument, {
    refetchQueries: 'active',
  });

  const submit = () => {
    const n = Number(value);
    if (value.trim() === '' || !Number.isFinite(n)) {
      toast.error('Enter a numeric value');
      return;
    }
    ingest({
      variables: { input: { sensorId, value: n } },
      onCompleted: () => {
        onOpenChange(false);
        setValue('');
        toast.success(`Logged ${n}${unit ? ` ${unit}` : ''} for “${sensorName}”`);
      },
      // Apollo's ErrorLink surfaces failures; swallow the rejection so it isn't
      // unhandled (the dialog stays open to retry).
    }).catch(() => {});
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Log a reading</DialogTitle>
          <DialogDescription>
            Record a value for “{sensorName}” now. It’s evaluated against the
            sensor’s alert rules like any ingested reading.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="log-value">Value{unit ? ` (${unit})` : ''}</Label>
          <Input
            id="log-value"
            type="number"
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="e.g. 22.4"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={loading || value.trim() === ''}>
            {loading ? 'Logging…' : 'Log reading'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
