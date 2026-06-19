import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

/** A tiny single-field dialog used for creating and renaming dashboards. */
export function NameDialog({
  open,
  onOpenChange,
  title,
  initial,
  submitLabel,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  initial?: string;
  submitLabel: string;
  onSubmit: (name: string) => void | Promise<void>;
}) {
  const [value, setValue] = useState(initial ?? '');
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    if (open) setValue(initial ?? '');
  }, [open, initial]);

  const submit = async () => {
    const v = value.trim();
    if (!v || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(v);
      onOpenChange(false); // close only after the mutation resolves
    } catch {
      // keep the dialog open so the user can retry
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <Input
          autoFocus
          value={value}
          maxLength={60}
          placeholder="Dashboard name"
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
          }}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!value.trim() || submitting}>
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
