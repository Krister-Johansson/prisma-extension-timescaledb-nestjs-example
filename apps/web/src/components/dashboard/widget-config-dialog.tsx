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
import type { WidgetFieldsFragment } from '@/graphql/dashboards.generated';
import { useCatalog } from './use-catalog';
import {
  parseStatConfig,
  STAT_AGGS,
  STAT_AGG_LABEL,
  WINDOWS,
  WINDOW_LABEL,
  type StatConfig,
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
  const [cfg, setCfg] = useState<StatConfig>(() =>
    parseStatConfig(widget.config),
  );
  const [saving, setSaving] = useState(false);
  const set = (patch: Partial<StatConfig>) => setCfg((c) => ({ ...c, ...patch }));
  const meta = WIDGET_TYPES[widget.type];

  const save = async () => {
    setSaving(true);
    try {
      const { w, h } =
        size === 'custom' ? { w: widget.w, h: widget.h } : SIZE_PRESETS[size];
      // Only the Stat widget persists the full config for now; other types just
      // keep their (future) config plus the shared title.
      const config =
        widget.type === 'stat'
          ? (cfg as Record<string, unknown>)
          : { ...((widget.config as object) ?? {}), title: cfg.title };
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
      <div className="space-y-3">
        <Field label="Title (optional)">
          <Input
            value={cfg.title ?? ''}
            maxLength={60}
            placeholder={meta?.label}
            onChange={(e) => set({ title: e.target.value || undefined })}
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

        {widget.type === 'stat' ? (
          <StatFields cfg={cfg} set={set} />
        ) : (
          <p className="text-[12px] text-muted-2">
            More options for this widget type are coming soon.
          </p>
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
      <DialogContent className="max-w-md">
        {widget && (
          <ConfigForm widget={widget} onClose={onClose} onSave={onSave} />
        )}
      </DialogContent>
    </Dialog>
  );
}
