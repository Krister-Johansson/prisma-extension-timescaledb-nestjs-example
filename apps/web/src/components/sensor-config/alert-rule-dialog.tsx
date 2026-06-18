import { useMutation } from '@apollo/client/react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { writeAlertRuleToCache } from '@/data/alert-rule-cache';
import {
  type SensorAlertRuleQuery,
  SetAlertRuleDocument,
} from '@/graphql/alert-rules.generated';
import { AlertRuleForm, type AlertRuleFormInput } from './alert-rule-form';

type LiveRule = NonNullable<SensorAlertRuleQuery['alertRule']>;

/**
 * Create/edit the sensor's alert rule (controlled). Owns the optimistic
 * setAlertRule mutation; the cache write links the upserted rule to the
 * alertRule(sensorId) field so it shows immediately.
 */
export function AlertRuleDialog({
  sensorId,
  unit,
  rule,
  open,
  onOpenChange,
}: {
  sensorId: string;
  unit: string;
  rule: LiveRule | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [setAlertRule, { loading }] = useMutation(SetAlertRuleDocument);
  const isEdit = rule !== null;

  const defaultValues: AlertRuleFormInput = rule
    ? {
        direction: rule.direction,
        threshold: String(rule.threshold),
        clearThreshold: String(rule.clearThreshold),
        severity: rule.severity === 'CRITICAL' ? 'CRITICAL' : 'WARNING',
      }
    : { direction: 'ABOVE', threshold: '', clearThreshold: '', severity: 'WARNING' };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit alert rule' : 'Add alert rule'}</DialogTitle>
          <DialogDescription>
            Fires when the latest reading crosses the threshold, and clears only
            once it returns past the reset value (a hysteresis band).
          </DialogDescription>
        </DialogHeader>
        <AlertRuleForm
          key={open ? (rule?.id ?? 'new') : 'closed'}
          defaultValues={defaultValues}
          unit={unit}
          pending={loading}
          onSubmit={(values) => {
            const enabled = rule?.enabled ?? true;
            setAlertRule({
              variables: { input: { sensorId, ...values, enabled } },
              optimisticResponse: {
                setAlertRule: {
                  __typename: 'AlertRule',
                  id: rule?.id ?? `temp:${sensorId}`,
                  sensorId,
                  enabled,
                  state: rule?.state ?? 'OK',
                  ...values,
                },
              },
              update: (cache, { data }) => {
                if (data?.setAlertRule)
                  writeAlertRuleToCache(cache, data.setAlertRule);
              },
              onCompleted: () => {
                onOpenChange(false);
                toast.success(isEdit ? 'Alert rule updated' : 'Alert rule created');
              },
              // Errors are surfaced globally by the Apollo ErrorLink; swallow the
              // rejection so it isn't unhandled (dialog stays open to retry).
            }).catch(() => {});
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
