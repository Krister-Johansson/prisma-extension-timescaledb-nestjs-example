import { useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trash2 } from 'lucide-react';
import type { WidgetFieldsFragment } from '@/graphql/dashboards.generated';
import { useCatalog } from './use-catalog';
import {
  CHART_TYPES,
  parseAlertsConfig,
  parseChartConfig,
  parseGaugeConfig,
  parseStatConfig,
  parseTableConfig,
  SERIES_AGGS,
  STAT_AGGS,
  STAT_AGG_LABEL,
  WINDOWS,
  WINDOW_LABEL,
  type AlertsConfig,
  type ChartConfig,
  type ChartSeries,
  type GaugeConfig,
  type StatConfig,
  type TableConfig,
} from './widget-config';
import {
  SIZE_KEYS,
  SIZE_PRESETS,
  WIDGET_TYPES,
  type SizeKey,
} from './widget-meta';

export interface WidgetSave {
  config: Record<string, unknown>;
  w: number;
  h: number;
}

const matchSize = (w: number, h: number): SizeKey | 'custom' =>
  SIZE_KEYS.find((k) => SIZE_PRESETS[k].w === w && SIZE_PRESETS[k].h === h) ??
  'custom';

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function SelectBox({
  value,
  placeholder,
  onValueChange,
  options,
}: {
  value?: string;
  placeholder?: string;
  onValueChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="h-8 text-[13px]">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function StatFields({
  cfg,
  set,
}: {
  cfg: StatConfig;
  set: (patch: Partial<StatConfig>) => void;
}) {
  const catalog = useCatalog();
  return (
    <>
      <Field label="Source">
        <div className="flex gap-1">
          <Button
            type="button"
            size="sm"
            variant={cfg.scope === 'sensor' ? 'default' : 'outline'}
            onClick={() => set({ scope: 'sensor' })}
          >
            Sensor
          </Button>
          <Button
            type="button"
            size="sm"
            variant={cfg.scope === 'group' ? 'default' : 'outline'}
            onClick={() => set({ scope: 'group' })}
          >
            Group + type
          </Button>
        </div>
      </Field>

      {cfg.scope === 'sensor' ? (
        <Field label="Sensor">
          <SelectBox
            value={cfg.sensorId}
            placeholder="Pick a sensor"
            onValueChange={(v) => set({ sensorId: v })}
            options={catalog.sensors.map((s) => ({ value: s.id, label: s.name }))}
          />
        </Field>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <Field label="Group">
            <SelectBox
              value={cfg.groupId}
              placeholder="Group"
              onValueChange={(v) => set({ groupId: v })}
              options={catalog.groups.map((g) => ({
                value: g.id,
                label: g.name,
              }))}
            />
          </Field>
          <Field label="Type">
            <SelectBox
              value={cfg.typeKey}
              placeholder="Type"
              onValueChange={(v) => set({ typeKey: v })}
              options={catalog.types.map((t) => ({
                value: t.key,
                label: t.label,
              }))}
            />
          </Field>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Field label="Value">
          <SelectBox
            value={cfg.agg}
            onValueChange={(v) => set({ agg: v as StatConfig['agg'] })}
            options={STAT_AGGS.map((a) => ({ value: a, label: STAT_AGG_LABEL[a] }))}
          />
        </Field>
        <Field label="Window">
          <SelectBox
            value={cfg.window}
            onValueChange={(v) => set({ window: v as StatConfig['window'] })}
            options={WINDOWS.map((w) => ({ value: w, label: WINDOW_LABEL[w] }))}
          />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-[12.5px]">
        <input
          type="checkbox"
          checked={cfg.sparkline}
          onChange={(e) => set({ sparkline: e.target.checked })}
        />
        Show sparkline
      </label>
    </>
  );
}

function ChartFields({
  cfg,
  set,
}: {
  cfg: ChartConfig;
  set: (patch: Partial<ChartConfig>) => void;
}) {
  const catalog = useCatalog();
  const updateSeries = (idx: number, p: Partial<ChartSeries>) =>
    set({
      series: cfg.series.map((s, i) => (i === idx ? { ...s, ...p } : s)),
    });

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Window">
          <SelectBox
            value={cfg.window}
            onValueChange={(v) => set({ window: v as ChartConfig['window'] })}
            options={WINDOWS.map((w) => ({ value: w, label: WINDOW_LABEL[w] }))}
          />
        </Field>
        <Field label="Chart type">
          <SelectBox
            value={cfg.chartType}
            onValueChange={(v) =>
              set({ chartType: v as ChartConfig['chartType'] })
            }
            options={CHART_TYPES.map((t) => ({
              value: t,
              label: t[0].toUpperCase() + t.slice(1),
            }))}
          />
        </Field>
      </div>

      <div className="space-y-2">
        <Label className="text-[11px] text-muted-foreground">Series</Label>
        {cfg.series.length === 0 && (
          <p className="text-[12px] text-muted-2">
            No series yet — add one below.
          </p>
        )}
        {cfg.series.map((s, idx) => (
          <div
            // eslint-disable-next-line react/no-array-index-key
            key={idx}
            className="space-y-1.5 rounded-md border border-border p-2"
          >
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                size="xs"
                variant={s.scope === 'sensor' ? 'default' : 'outline'}
                onClick={() => updateSeries(idx, { scope: 'sensor' })}
              >
                Sensor
              </Button>
              <Button
                type="button"
                size="xs"
                variant={s.scope === 'group' ? 'default' : 'outline'}
                onClick={() => updateSeries(idx, { scope: 'group' })}
              >
                Group
              </Button>
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                className="ml-auto"
                aria-label="Remove series"
                onClick={() =>
                  set({ series: cfg.series.filter((_, i) => i !== idx) })
                }
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
            {s.scope === 'sensor' ? (
              <SelectBox
                value={s.sensorId}
                placeholder="Sensor"
                onValueChange={(v) => updateSeries(idx, { sensorId: v })}
                options={catalog.sensors.map((x) => ({
                  value: x.id,
                  label: x.name,
                }))}
              />
            ) : (
              <div className="grid grid-cols-2 gap-1.5">
                <SelectBox
                  value={s.groupId}
                  placeholder="Group"
                  onValueChange={(v) => updateSeries(idx, { groupId: v })}
                  options={catalog.groups.map((g) => ({
                    value: g.id,
                    label: g.name,
                  }))}
                />
                <SelectBox
                  value={s.typeKey}
                  placeholder="Type"
                  onValueChange={(v) => updateSeries(idx, { typeKey: v })}
                  options={catalog.types.map((t) => ({
                    value: t.key,
                    label: t.label,
                  }))}
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-1.5">
              <SelectBox
                value={s.agg}
                onValueChange={(v) =>
                  updateSeries(idx, { agg: v as ChartSeries['agg'] })
                }
                options={SERIES_AGGS.map((a) => ({ value: a, label: a }))}
              />
              <Input
                className="h-8 text-[13px]"
                placeholder="Label (optional)"
                value={s.label ?? ''}
                maxLength={40}
                onChange={(e) =>
                  updateSeries(idx, { label: e.target.value || undefined })
                }
              />
            </div>
          </div>
        ))}
        {cfg.series.length < 6 && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              set({
                series: [
                  ...cfg.series,
                  {
                    scope: 'group',
                    agg: 'AVG',
                    sensorId: undefined,
                    groupId: undefined,
                    typeKey: undefined,
                    label: undefined,
                  },
                ],
              })
            }
          >
            + Add series
          </Button>
        )}
      </div>
    </>
  );
}

function NumberInput({
  value,
  onChange,
}: {
  value?: number;
  onChange: (n: number | undefined) => void;
}) {
  return (
    <Input
      type="number"
      className="h-8 text-[13px]"
      value={value ?? ''}
      onChange={(e) =>
        onChange(e.target.value === '' ? undefined : Number(e.target.value))
      }
    />
  );
}

/** Shared sensor/group+type source picker used by Stat and Gauge. */
function SourcePicker({
  cfg,
  set,
}: {
  cfg: { scope: 'sensor' | 'group'; sensorId?: string; groupId?: string; typeKey?: string };
  set: (p: { scope?: 'sensor' | 'group'; sensorId?: string; groupId?: string; typeKey?: string }) => void;
}) {
  const catalog = useCatalog();
  return (
    <>
      <Field label="Source">
        <div className="flex gap-1">
          <Button
            type="button"
            size="sm"
            variant={cfg.scope === 'sensor' ? 'default' : 'outline'}
            onClick={() => set({ scope: 'sensor' })}
          >
            Sensor
          </Button>
          <Button
            type="button"
            size="sm"
            variant={cfg.scope === 'group' ? 'default' : 'outline'}
            onClick={() => set({ scope: 'group' })}
          >
            Group + type
          </Button>
        </div>
      </Field>
      {cfg.scope === 'sensor' ? (
        <Field label="Sensor">
          <SelectBox
            value={cfg.sensorId}
            placeholder="Pick a sensor"
            onValueChange={(v) => set({ sensorId: v })}
            options={catalog.sensors.map((s) => ({ value: s.id, label: s.name }))}
          />
        </Field>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <Field label="Group">
            <SelectBox
              value={cfg.groupId}
              placeholder="Group"
              onValueChange={(v) => set({ groupId: v })}
              options={catalog.groups.map((g) => ({ value: g.id, label: g.name }))}
            />
          </Field>
          <Field label="Type">
            <SelectBox
              value={cfg.typeKey}
              placeholder="Type"
              onValueChange={(v) => set({ typeKey: v })}
              options={catalog.types.map((t) => ({ value: t.key, label: t.label }))}
            />
          </Field>
        </div>
      )}
    </>
  );
}

function GaugeFields({
  cfg,
  set,
}: {
  cfg: GaugeConfig;
  set: (p: Partial<GaugeConfig>) => void;
}) {
  return (
    <>
      <SourcePicker cfg={cfg} set={set} />
      <div className="grid grid-cols-2 gap-2">
        <Field label="Value">
          <SelectBox
            value={cfg.agg}
            onValueChange={(v) => set({ agg: v as GaugeConfig['agg'] })}
            options={STAT_AGGS.map((a) => ({ value: a, label: STAT_AGG_LABEL[a] }))}
          />
        </Field>
        <Field label="Window">
          <SelectBox
            value={cfg.window}
            onValueChange={(v) => set({ window: v as GaugeConfig['window'] })}
            options={WINDOWS.map((w) => ({ value: w, label: WINDOW_LABEL[w] }))}
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Min">
          <NumberInput value={cfg.min} onChange={(n) => set({ min: n ?? 0 })} />
        </Field>
        <Field label="Max">
          <NumberInput value={cfg.max} onChange={(n) => set({ max: n ?? 100 })} />
        </Field>
        <Field label="Warn ≥">
          <NumberInput value={cfg.warn} onChange={(n) => set({ warn: n })} />
        </Field>
        <Field label="Danger ≥">
          <NumberInput value={cfg.danger} onChange={(n) => set({ danger: n })} />
        </Field>
      </div>
    </>
  );
}

function AlertsFields({
  cfg,
  set,
}: {
  cfg: AlertsConfig;
  set: (p: Partial<AlertsConfig>) => void;
}) {
  return (
    <Field label="Max rows">
      <NumberInput value={cfg.limit} onChange={(n) => set({ limit: n ?? 8 })} />
    </Field>
  );
}

const ALL = '__all__';
function TableFields({
  cfg,
  set,
}: {
  cfg: TableConfig;
  set: (p: Partial<TableConfig>) => void;
}) {
  const catalog = useCatalog();
  return (
    <div className="grid grid-cols-2 gap-2">
      <Field label="Group">
        <SelectBox
          value={cfg.groupId ?? ALL}
          onValueChange={(v) => set({ groupId: v === ALL ? undefined : v })}
          options={[
            { value: ALL, label: 'All groups' },
            ...catalog.groups.map((g) => ({ value: g.id, label: g.name })),
          ]}
        />
      </Field>
      <Field label="Type">
        <SelectBox
          value={cfg.typeKey ?? ALL}
          onValueChange={(v) => set({ typeKey: v === ALL ? undefined : v })}
          options={[
            { value: ALL, label: 'All types' },
            ...catalog.types.map((t) => ({ value: t.key, label: t.label })),
          ]}
        />
      </Field>
    </div>
  );
}

function initialConfig(widget: WidgetFieldsFragment): Record<string, unknown> {
  const parse: Record<string, (c: unknown) => object> = {
    stat: parseStatConfig,
    chart: parseChartConfig,
    gauge: parseGaugeConfig,
    alerts: parseAlertsConfig,
    table: parseTableConfig,
  };
  const fn = parse[widget.type];
  return fn
    ? (fn(widget.config) as Record<string, unknown>)
    : { ...((widget.config as object) ?? {}) };
}

function ConfigForm({
  widget,
  onClose,
  onSave,
}: {
  widget: WidgetFieldsFragment;
  onClose: () => void;
  onSave: (input: WidgetSave) => Promise<unknown> | void;
}) {
  const [size, setSize] = useState<SizeKey | 'custom'>(() =>
    matchSize(widget.w, widget.h),
  );
  const [config, setConfig] = useState<Record<string, unknown>>(() =>
    initialConfig(widget),
  );
  const [saving, setSaving] = useState(false);
  const patch = (p: Record<string, unknown>) =>
    setConfig((c) => ({ ...c, ...p }));
  const meta = WIDGET_TYPES[widget.type];

  const save = async () => {
    setSaving(true);
    try {
      const { w, h } =
        size === 'custom' ? { w: widget.w, h: widget.h } : SIZE_PRESETS[size];
      await onSave({ config, w, h });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Configure {meta?.label ?? widget.type}</DialogTitle>
      </DialogHeader>
      <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
        <Field label="Title (optional)">
          <Input
            value={(config.title as string) ?? ''}
            maxLength={60}
            placeholder={meta?.label}
            onChange={(e) => patch({ title: e.target.value || undefined })}
          />
        </Field>
        <Field label="Size">
          <div className="flex gap-1">
            {SIZE_KEYS.map((k) => (
              <Button
                key={k}
                type="button"
                size="sm"
                variant={size === k ? 'default' : 'outline'}
                className="uppercase"
                onClick={() => setSize(k)}
              >
                {k}
              </Button>
            ))}
          </div>
        </Field>

        {widget.type === 'stat' && (
          <StatFields
            cfg={config as unknown as StatConfig}
            set={patch as (p: Partial<StatConfig>) => void}
          />
        )}
        {widget.type === 'chart' && (
          <ChartFields
            cfg={config as unknown as ChartConfig}
            set={patch as (p: Partial<ChartConfig>) => void}
          />
        )}
        {widget.type === 'gauge' && (
          <GaugeFields
            cfg={config as unknown as GaugeConfig}
            set={patch as (p: Partial<GaugeConfig>) => void}
          />
        )}
        {widget.type === 'alerts' && (
          <AlertsFields
            cfg={config as unknown as AlertsConfig}
            set={patch as (p: Partial<AlertsConfig>) => void}
          />
        )}
        {widget.type === 'table' && (
          <TableFields
            cfg={config as unknown as TableConfig}
            set={patch as (p: Partial<TableConfig>) => void}
          />
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={save} disabled={saving}>
          Save
        </Button>
      </DialogFooter>
    </>
  );
}

export function WidgetConfigDialog({
  widget,
  onClose,
  onSave,
}: {
  widget: WidgetFieldsFragment | null;
  onClose: () => void;
  onSave: (input: WidgetSave) => Promise<unknown> | void;
}) {
  return (
    <Dialog open={widget !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-md"
        // The Select/Popover dropdowns render in a portal outside the dialog, so
        // dismissing one reads as an "interact outside". Ignore those so only a
        // genuine outside click closes the dialog.
        onInteractOutside={(e) => {
          const target = e.target as HTMLElement | null;
          if (target?.closest('[data-radix-popper-content-wrapper]')) {
            e.preventDefault();
          }
        }}
      >
        {widget && (
          // Key by id so switching the target widget remounts the form with
          // fresh state instead of keeping the previous widget's values.
          <ConfigForm
            key={widget.id}
            widget={widget}
            onClose={onClose}
            onSave={onSave}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
