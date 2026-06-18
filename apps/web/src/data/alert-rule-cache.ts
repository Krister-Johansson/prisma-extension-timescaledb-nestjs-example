import type { ApolloCache } from '@apollo/client';
import {
  type CreateAlertRuleMutation,
  SensorAlertRulesDocument,
} from '@/graphql/alert-rules.generated';

type Rule = CreateAlertRuleMutation['createAlertRule'];

/**
 * Append a newly-created rule to the cached `alertRules(sensorId)` list. Apollo
 * can't infer that a new rule belongs to the list, so write it explicitly (runs
 * for both the optimistic and the real result). Edits normalize by id, so they
 * need no cache fix-up.
 */
export function addAlertRuleToCache(cache: ApolloCache, rule: Rule): void {
  const existing = cache.readQuery({
    query: SensorAlertRulesDocument,
    variables: { sensorId: rule.sensorId },
  });
  const list = existing?.alertRules ?? [];
  if (list.some((r) => r.id === rule.id)) return;
  cache.writeQuery({
    query: SensorAlertRulesDocument,
    variables: { sensorId: rule.sensorId },
    data: { alertRules: [...list, rule] },
  });
}

/** Remove a rule from the cached list and evict its normalized entity. */
export function removeAlertRuleFromCache(
  cache: ApolloCache,
  sensorId: string,
  ruleId: string,
): void {
  const existing = cache.readQuery({
    query: SensorAlertRulesDocument,
    variables: { sensorId },
  });
  const list = (existing?.alertRules ?? []).filter((r) => r.id !== ruleId);
  cache.writeQuery({
    query: SensorAlertRulesDocument,
    variables: { sensorId },
    data: { alertRules: list },
  });
  cache.evict({ id: cache.identify({ __typename: 'AlertRule', id: ruleId }) });
  cache.gc();
}
