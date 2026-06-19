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
  onSubmit: (name: string) => void;
}) {
  const [value, setValue] = useState(initial ?? '');
  useEffect(() => {
    if (open) setValue(initial ?? '');
  }, [open, initial]);

  const submit = () => {
    const v = value.trim();
    if (!v) return;
    onSubmit(v);
    onOpenChange(false);
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
          <Button onClick={submit} disabled={!value.trim()}>
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
