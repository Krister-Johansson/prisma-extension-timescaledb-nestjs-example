import { useMutation } from '@apollo/client/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  type SensorAlertRulesQuery,
  UpdateAlertRuleDocument,
} from '@/graphql/alert-rules.generated';

type LiveRule = SensorAlertRulesQuery['alertRules'][number];

/** Enable/disable a rule via updateAlertRule (optimistic), keeping its thresholds. */
export function AlertRuleToggle({ rule }: { rule: LiveRule }) {
  const [updateRule, { loading }] = useMutation(UpdateAlertRuleDocument);
  const next = !rule.enabled;

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={loading}
      onClick={() => {
        void updateRule({
          variables: {
            id: rule.id,
            input: {
              direction: rule.direction,
              threshold: rule.threshold,
              clearThreshold: rule.clearThreshold,
              severity: rule.severity,
              enabled: next,
            },
          },
          optimisticResponse: {
            updateAlertRule: { ...rule, enabled: next },
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
