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

export interface SensorOption {
  id: string;
  name: string;
  unit: string;
}

export interface EmulatorValues {
  sensorId: string;
  min: number;
  max: number;
  intervalSeconds: number;
}

const decimal = z
  .string()
  .trim()
  .min(1, 'Required')
  .refine((v) => Number.isFinite(Number(v)), 'Enter a number')
  .transform(Number);

const whole = z
  .string()
  .trim()
  .min(1, 'Required')
  .refine((v) => /^\d+$/.test(v) && Number(v) >= 1, 'Whole number ≥ 1')
  .transform(Number);

export const emulatorFormSchema = z
  .object({
    sensorId: z.string().min(1, 'Pick a sensor'),
    min: decimal,
    max: decimal,
    intervalValue: whole,
    intervalUnit: z.enum(['SECONDS', 'MINUTES']),
  })
  .refine((v) => v.min < v.max, {
    message: 'Min must be less than max',
    path: ['max'],
  })
  .refine(
    (v) => {
      const s = v.intervalValue * (v.intervalUnit === 'MINUTES' ? 60 : 1);
      return s >= 1 && s <= 3600;
    },
    { message: 'Interval must be between 1s and 60min', path: ['intervalValue'] },
  );

type FormInput = z.input<typeof emulatorFormSchema>;

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

/** Create-emulator form (TanStack Form + Zod). Interval is entered as a value +
 * unit and converted to seconds on submit. */
export function EmulatorForm({
  sensors,
  pending,
  onSubmit,
}: {
  sensors: SensorOption[];
  pending: boolean;
  onSubmit: (values: EmulatorValues) => void;
}) {
  const defaultValues: FormInput = {
    sensorId: '',
    min: '',
    max: '',
    intervalValue: '5',
    intervalUnit: 'SECONDS',
  };
  const form = useForm({
    defaultValues,
    validators: { onChange: emulatorFormSchema },
    onSubmit: ({ value }) => {
      const v = emulatorFormSchema.parse(value);
      onSubmit({
        sensorId: v.sensorId,
        min: v.min,
        max: v.max,
        intervalSeconds:
          v.intervalValue * (v.intervalUnit === 'MINUTES' ? 60 : 1),
      });
    },
  });

  const unit = sensors.find((s) => s.id === form.state.values.sensorId)?.unit;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void form.handleSubmit();
      }}
      className="flex flex-col gap-4"
    >
      <form.Field name="sensorId">
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={field.name}>Sensor</Label>
            <Select
              value={field.state.value}
              onValueChange={(v) => field.handleChange(v)}
            >
              <SelectTrigger id={field.name} className="w-full">
                <SelectValue placeholder="Pick a sensor" />
              </SelectTrigger>
              <SelectContent>
                {sensors.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError meta={field.state.meta} />
          </div>
        )}
      </form.Field>

      <div className="grid grid-cols-2 gap-3">
        <form.Field name="min">
          {(field) => (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={field.name}>Min{unit ? ` (${unit})` : ''}</Label>
              <Input
                id={field.name}
                inputMode="decimal"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
              />
              <FieldError meta={field.state.meta} />
            </div>
          )}
        </form.Field>
        <form.Field name="max">
          {(field) => (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={field.name}>Max{unit ? ` (${unit})` : ''}</Label>
              <Input
                id={field.name}
                inputMode="decimal"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
              />
              <FieldError meta={field.state.meta} />
            </div>
          )}
        </form.Field>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Report every</Label>
        <div className="flex gap-3">
          <form.Field name="intervalValue">
            {(field) => (
              <div className="flex flex-1 flex-col gap-1.5">
                <Input
                  id={field.name}
                  inputMode="numeric"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
                <FieldError meta={field.state.meta} />
              </div>
            )}
          </form.Field>
          <form.Field name="intervalUnit">
            {(field) => (
              <Select
                value={field.state.value}
                onValueChange={(v) =>
                  field.handleChange(v as 'SECONDS' | 'MINUTES')
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SECONDS">seconds</SelectItem>
                  <SelectItem value="MINUTES">minutes</SelectItem>
                </SelectContent>
              </Select>
            )}
          </form.Field>
        </div>
      </div>

      <form.Subscribe selector={(state) => state.canSubmit}>
        {(canSubmit) => (
          <Button
            type="submit"
            disabled={!canSubmit || pending}
            className="mt-1 self-end"
          >
            {pending ? 'Creating…' : 'Create emulator'}
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
}
