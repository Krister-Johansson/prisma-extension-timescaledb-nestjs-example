import { useMutation, useQuery } from '@apollo/client/react';
import { Tag } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { QueryError } from '@/components/common/query-error';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CreateSensorTypeDocument,
  SensorTypesDocument,
} from '@/graphql/sensors.generated';

const KEY_RE = /^[A-Z0-9_]+$/;

/** Manage panel: the dynamic measurement types + a "New type" dialog. Creating
 * one makes it immediately pickable in the Add-sensor form. */
export function SensorTypesPanel() {
  const { data, loading, error } = useQuery(SensorTypesDocument, {
    context: { suppressErrorToast: true },
  });
  const [createType, { loading: creating }] = useMutation(
    CreateSensorTypeDocument,
    { refetchQueries: ['SensorTypes'] },
  );

  const [open, setOpen] = useState(false);
  const [key, setKey] = useState('');
  const [label, setLabel] = useState('');
  const [unit, setUnit] = useState('');

  const keyValid = KEY_RE.test(key);
  const canSubmit =
    keyValid && label.trim().length > 0 && unit.trim().length > 0 && !creating;

  const reset = () => {
    setKey('');
    setLabel('');
    setUnit('');
  };
  const submit = async () => {
    if (!canSubmit) return;
    try {
      await createType({
        variables: {
          input: { key, label: label.trim(), unit: unit.trim() },
        },
      });
      setOpen(false);
      reset();
      toast.success(`Type “${label.trim()}” created`);
    } catch {
      // Surfaced by the global Apollo error toast (e.g. duplicate key); keep the
      // dialog open so the user can adjust and retry.
    }
  };

  const types = data?.sensorTypes ?? [];

  return (
    <div className="rounded-[14px] border border-border bg-card p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Types</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            reset();
            setOpen(true);
          }}
        >
          <Tag className="size-3.5" />
          New type
        </Button>
      </div>

      {loading && !data ? (
        <div className="flex flex-wrap gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-7 w-28 rounded-md" />
          ))}
        </div>
      ) : error ? (
        <QueryError message={error.message} />
      ) : types.length === 0 ? (
        <div className="py-6 text-center text-[12.5px] text-muted-foreground">
          No types yet — create one (e.g. CO₂ · ppm) to add matching sensors.
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {types.map((t) => (
            <div
              key={t.key}
              className="flex items-center gap-1.5 rounded-md border border-border bg-surface-2 px-2.5 py-1"
            >
              <span className="text-[12.5px] font-medium">{t.label}</span>
              <span className="font-mono text-[10.5px] text-muted-2">
                {t.unit}
              </span>
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) reset();
        }}
      >
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle>New measurement type</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="type-key">Key</Label>
              <Input
                id="type-key"
                autoFocus
                placeholder="CO2"
                value={key}
                onChange={(e) => setKey(e.target.value.toUpperCase())}
              />
              <p className="text-[12px] text-muted-foreground">
                Stable slug — uppercase letters, digits, underscore.
              </p>
              {key.length > 0 && !keyValid && (
                <p className="text-[12px] text-alert">
                  Only A–Z, 0–9 and underscore.
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="type-label">Label</Label>
              <Input
                id="type-label"
                placeholder="CO₂"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="type-unit">Unit</Label>
              <Input
                id="type-unit"
                placeholder="ppm"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={!canSubmit}>
              Create type
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
