import { useMutation } from '@apollo/client/react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { addAlertRuleToCache } from '@/data/alert-rule-cache';
import {
  CreateAlertRuleDocument,
  type SensorAlertRulesQuery,
  UpdateAlertRuleDocument,
} from '@/graphql/alert-rules.generated';
import { AlertRuleForm, type AlertRuleFormInput } from './alert-rule-form';

type LiveRule = SensorAlertRulesQuery['alertRules'][number];

/**
 * Create or edit an alert rule (controlled). Owns the optimistic mutation:
 * create appends to the sensor's rule list; edit normalizes by id.
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
  const [createRule, { loading: creating }] =
    useMutation(CreateAlertRuleDocument);
  const [updateRule, { loading: updating }] =
    useMutation(UpdateAlertRuleDocument);
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
          pending={creating || updating}
          onSubmit={(values) => {
            if (rule) {
              void updateRule({
                variables: {
                  id: rule.id,
                  input: { ...values, enabled: rule.enabled },
                },
                optimisticResponse: {
                  updateAlertRule: {
                    __typename: 'AlertRule',
                    id: rule.id,
                    sensorId,
                    enabled: rule.enabled,
                    state: rule.state,
                    ...values,
                  },
                },
                onCompleted: () => {
                  onOpenChange(false);
                  toast.success('Alert rule updated');
                },
              }).catch(() => {});
            } else {
              void createRule({
                variables: { input: { sensorId, ...values, enabled: true } },
                optimisticResponse: {
                  createAlertRule: {
                    __typename: 'AlertRule',
                    id: crypto.randomUUID(),
                    sensorId,
                    enabled: true,
                    state: 'OK',
                    ...values,
                  },
                },
                update: (cache, { data }) => {
                  if (data?.createAlertRule)
                    addAlertRuleToCache(cache, data.createAlertRule);
                },
                onCompleted: () => {
                  onOpenChange(false);
                  toast.success('Alert rule created');
                },
              }).catch(() => {});
            }
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
