import { useQuery } from '@apollo/client/react';
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
import { SensorTypesDocument } from '@/graphql/sensors.generated';

const sensorFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  typeKey: z.string().min(1, 'Type is required'),
});

export type SensorFormValues = z.infer<typeof sensorFormSchema>;

// Only surfaces errors once the field has been touched (or the form submitted),
// so changing one field doesn't light up untouched fields.
function FieldError({
  meta,
}: {
  meta: { isTouched: boolean; errors: unknown[] };
}) {
  if (!meta.isTouched) return null;
  const message = meta.errors
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
 * Sensor create/edit form (TanStack Form + Zod). The owning dialog passes
 * `onSubmit` and the mutation `pending` flag. The type list is fetched from the
 * API (dynamic types); the unit comes from the chosen type, so there's no unit
 * field. `type` is locked on edit (the API keeps it immutable).
 */
export function SensorForm({
  defaultValues,
  submitLabel,
  pending,
  typeLocked = false,
  onSubmit,
}: {
  defaultValues: SensorFormValues;
  submitLabel: string;
  pending: boolean;
  typeLocked?: boolean;
  onSubmit: (values: SensorFormValues) => void;
}) {
  const { data } = useQuery(SensorTypesDocument, {
    context: { suppressErrorToast: true },
  });
  const types = data?.sensorTypes ?? [];

  const form = useForm({
    defaultValues,
    validators: { onChange: sensorFormSchema },
    onSubmit: ({ value }) => onSubmit(value),
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
      <form.Field name="name">
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={field.name}>Name</Label>
            <Input
              id={field.name}
              name={field.name}
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              placeholder="Boiler temperature"
              autoFocus
            />
            <FieldError meta={field.state.meta} />
          </div>
        )}
      </form.Field>

      <form.Field name="typeKey">
        {(field) => {
          const selected = types.find((t) => t.key === field.state.value);
          return (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={field.name}>Type</Label>
              <Select
                value={field.state.value}
                onValueChange={(value) => field.handleChange(value)}
                disabled={typeLocked}
              >
                <SelectTrigger id={field.name} className="w-full">
                  <SelectValue placeholder="Select a type" />
                </SelectTrigger>
                <SelectContent>
                  {types.map((t) => (
                    <SelectItem key={t.key} value={t.key}>
                      {t.label} · {t.unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {typeLocked ? (
                <p className="text-[12px] text-muted-foreground">
                  Type can&apos;t change after a sensor is created.
                </p>
              ) : (
                selected && (
                  <p className="text-[12px] text-muted-foreground">
                    Readings will be in {selected.unit}.
                  </p>
                )
              )}
            </div>
          );
        }}
      </form.Field>

      <form.Subscribe selector={(state) => state.canSubmit}>
        {(canSubmit) => (
          <Button
            type="submit"
            disabled={!canSubmit || pending}
            className="mt-1 self-end"
          >
            {pending ? 'Saving…' : submitLabel}
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
}
