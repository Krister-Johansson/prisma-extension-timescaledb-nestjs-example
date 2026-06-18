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
import { UNIT } from '@/data/sensors';
import type { SensorType } from '@/data/types';

const SENSOR_TYPES = ['TEMPERATURE', 'PRESSURE', 'HUMIDITY'] as const;

const TYPE_LABELS: Record<SensorType, string> = {
  TEMPERATURE: 'Temperature',
  PRESSURE: 'Pressure',
  HUMIDITY: 'Humidity',
};

export const sensorFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  type: z.enum(SENSOR_TYPES),
  unit: z.string().trim().min(1, 'Unit is required'),
});

export type SensorFormValues = z.infer<typeof sensorFormSchema>;

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
 * Sensor create/edit form (TanStack Form + Zod). The owning dialog passes
 * `onSubmit` and the mutation `pending` flag, and decides what to do with the
 * values — the form holds no mutation logic. `type` is locked on edit (the API
 * keeps it immutable) and, on create, selecting a type prefills its usual unit.
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
            <FieldError errors={field.state.meta.errors} />
          </div>
        )}
      </form.Field>

      <form.Field name="type">
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={field.name}>Type</Label>
            <Select
              value={field.state.value}
              onValueChange={(value) => {
                const type = value as SensorType;
                field.handleChange(type);
                form.setFieldValue('unit', UNIT[type]);
              }}
              disabled={typeLocked}
            >
              <SelectTrigger id={field.name} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SENSOR_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {typeLocked && (
              <p className="text-[12px] text-muted-foreground">
                Type can&apos;t change after a sensor is created.
              </p>
            )}
          </div>
        )}
      </form.Field>

      <form.Field name="unit">
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={field.name}>Unit</Label>
            <Input
              id={field.name}
              name={field.name}
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              placeholder="°C"
            />
            <FieldError errors={field.state.meta.errors} />
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
            {pending ? 'Saving…' : submitLabel}
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
}
