import { Pencil } from 'lucide-react';
import { useState } from 'react';
import { AlertRuleSection } from '@/components/alert-rule/alert-rule-section';
import { SensorEditDialog } from '@/components/sensor/sensor-edit-dialog';
import { Button } from '@/components/ui/button';
import type { SensorType } from '@/data/types';
import { DetailAlertHistory } from './detail-alert-history';
import { DetailReadingsChart } from './detail-readings-chart';

const TYPE_LABELS: Record<SensorType, string> = {
  TEMPERATURE: 'Temperature',
  PRESSURE: 'Pressure',
  HUMIDITY: 'Humidity',
};

type DetailSensor = {
  id: string;
  name: string;
  type: SensorType;
  unit: string;
  createdAt: string;
};

/**
 * Minimal live sensor detail: identity + an edit-name action. Time-series,
 * aggregates and alerts are wired in a later PR. Editing shares the normalized
 * Sensor entity, so the name here updates the moment the edit is applied.
 */
export function SensorSummary({ sensor }: { sensor: DetailSensor }) {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[14px] border border-border bg-card p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">{sensor.name}</h2>
            <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-3">
              <Field label="Type" value={TYPE_LABELS[sensor.type]} />
              <Field label="Unit" value={sensor.unit} />
              <Field
                label="Created"
                value={new Date(sensor.createdAt).toLocaleString()}
              />
              <Field label="ID" value={sensor.id} mono />
            </dl>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 gap-1.5"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="size-3.5" />
            Edit
          </Button>
        </div>
      </div>

      <DetailReadingsChart sensorId={sensor.id} unit={sensor.unit} />

      <AlertRuleSection sensor={sensor} />

      <DetailAlertHistory sensorId={sensor.id} unit={sensor.unit} />

      <p className="text-xs leading-relaxed text-muted-2">
        Hourly aggregates for this sensor are coming in a later update.
      </p>

      <SensorEditDialog
        sensor={sensor}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </div>
  );
}

function Field({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="font-mono text-[10.5px] uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd
        className={
          mono
            ? 'truncate font-mono text-[12px] text-muted-foreground'
            : 'text-sm font-medium'
        }
      >
        {value}
      </dd>
    </div>
  );
}
