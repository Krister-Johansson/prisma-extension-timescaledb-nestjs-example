import type { ApolloCache } from '@apollo/client';
import {
  type SetAlertRuleMutation,
  SensorAlertRuleDocument,
} from '@/graphql/alert-rules.generated';

/**
 * Point the `alertRule(sensorId)` query field at the upserted rule. Updating an
 * existing rule normalizes by id automatically, but a first-time create needs
 * the field (previously `null`) linked to the new entity — so write it
 * explicitly. Runs for both the optimistic and the real result.
 */
export function writeAlertRuleToCache(
  cache: ApolloCache,
  rule: SetAlertRuleMutation['setAlertRule'],
): void {
  cache.writeQuery({
    query: SensorAlertRuleDocument,
    variables: { sensorId: rule.sensorId },
    data: { alertRule: rule },
  });
}

/** Null the `alertRule(sensorId)` field and evict the deleted rule entity. */
export function removeAlertRuleFromCache(
  cache: ApolloCache,
  sensorId: string,
  ruleId: string,
): void {
  cache.writeQuery({
    query: SensorAlertRuleDocument,
    variables: { sensorId },
    data: { alertRule: null },
  });
  cache.evict({ id: cache.identify({ __typename: 'AlertRule', id: ruleId }) });
  cache.gc();
}
