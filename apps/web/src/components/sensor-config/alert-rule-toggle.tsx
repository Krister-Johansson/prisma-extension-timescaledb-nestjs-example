import { useMutation } from '@apollo/client/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { writeAlertRuleToCache } from '@/data/alert-rule-cache';
import {
  type SensorAlertRuleQuery,
  SetAlertRuleDocument,
} from '@/graphql/alert-rules.generated';

type LiveRule = NonNullable<SensorAlertRuleQuery['alertRule']>;

/** Enable/disable the rule via setAlertRule (optimistic), keeping its thresholds. */
export function AlertRuleToggle({ rule }: { rule: LiveRule }) {
  const [setAlertRule, { loading }] = useMutation(SetAlertRuleDocument);
  const next = !rule.enabled;

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={loading}
      onClick={() => {
        void setAlertRule({
          variables: {
            input: {
              sensorId: rule.sensorId,
              direction: rule.direction,
              threshold: rule.threshold,
              clearThreshold: rule.clearThreshold,
              severity: rule.severity,
              enabled: next,
            },
          },
          optimisticResponse: {
            setAlertRule: { ...rule, enabled: next },
          },
          update: (cache, { data }) => {
            if (data?.setAlertRule)
              writeAlertRuleToCache(cache, data.setAlertRule);
          },
          onCompleted: () =>
            toast.success(next ? 'Alert rule enabled' : 'Alert rule disabled'),
        }).catch(() => {});
      }}
    >
      {rule.enabled ? 'Disable' : 'Enable'}
    </Button>
  );
}
