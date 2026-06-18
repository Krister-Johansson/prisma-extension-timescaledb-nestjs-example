import { useForm } from '@tanstack/react-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const number = z
  .string()
  .trim()
  .min(1, 'Required')
  .refine((v) => Number.isFinite(Number(v)), 'Enter a number')
  .transform(Number);

export const alertRuleSchema = z
  .object({
    direction: z.enum(['ABOVE', 'BELOW']),
    threshold: number,
    clearThreshold: number,
    severity: z.enum(['WARNING', 'CRITICAL']),
  })
  .refine(
    (v) =>
      v.direction === 'ABOVE'
        ? v.clearThreshold < v.threshold
        : v.clearThreshold > v.threshold,
    {
      message:
        'Reset must be on the resetting side of the threshold (below it for "above" rules, above it for "below" rules).',
      path: ['clearThreshold'],
    },
  );

export type AlertRuleFormInput = z.input<typeof alertRuleSchema>;
export type AlertRuleFormValues = z.output<typeof alertRuleSchema>;

function FieldError({ errors }: { errors: unknown[] }) {
  const message = errors
    .map((e) =>
      typeof e === 'string'
        ? e
        : e && typeof e === 'object' && 'message' in e
          ? String((e as { message?: unknown }).message ?? '')
          : '',
    )
    .filter(Boolean)
    .join(', ');
  if (!message) return null;
  return <p className="text-[12px] text-alert">{message}</p>;
}

/**
 * Alert-rule form (TanStack Form + Zod). Thresholds are entered as text and
 * coerced to numbers; a form-level refine enforces the hysteresis band. The
 * owning dialog passes `onSubmit` (parsed values) and the mutation `pending`.
 */
export function AlertRuleForm({
  defaultValues,
  unit,
  pending,
  onSubmit,
}: {
  defaultValues: AlertRuleFormInput;
  unit: string;
  pending: boolean;
  onSubmit: (values: AlertRuleFormValues) => void;
}) {
  const form = useForm({
    defaultValues,
    validators: { onChange: alertRuleSchema },
    onSubmit: ({ value }) => onSubmit(alertRuleSchema.parse(value)),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void form.handleSubmit();
      }}
      className="flex flex-col gap-4"
    >
      <form.Field name="direction">
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={field.name}>Direction</Label>
            <Select
              value={field.state.value}
              onValueChange={(v) => field.handleChange(v as 'ABOVE' | 'BELOW')}
            >
              <SelectTrigger id={field.name} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ABOVE">Above threshold</SelectItem>
                <SelectItem value="BELOW">Below threshold</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </form.Field>

      <form.Field name="threshold">
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={field.name}>Alert threshold ({unit})</Label>
            <Input
              id={field.name}
              inputMode="decimal"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
            />
            <FieldError errors={field.state.meta.errors} />
          </div>
        )}
      </form.Field>

      <form.Field name="clearThreshold">
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={field.name}>Reset threshold ({unit})</Label>
            <Input
              id={field.name}
              inputMode="decimal"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
            />
            <FieldError errors={field.state.meta.errors} />
          </div>
        )}
      </form.Field>

      <form.Field name="severity">
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={field.name}>Severity</Label>
            <Select
              value={field.state.value}
              onValueChange={(v) =>
                field.handleChange(v as 'WARNING' | 'CRITICAL')
              }
            >
              <SelectTrigger id={field.name} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="WARNING">Warning</SelectItem>
                <SelectItem value="CRITICAL">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </form.Field>

      <form.Subscribe selector={(state) => state.canSubmit}>
        {(canSubmit) => (
          <Button
            type="submit"
            disabled={!canSubmit || pending}
            className="mt-1 self-end"
          >
            {pending ? 'Saving…' : 'Save rule'}
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
}
