import { useQuery } from '@apollo/client/react';
import { SensorAlertRuleDocument } from '@/graphql/alert-rules.generated';
import type { SensorDetailQuery } from '@/graphql/sensors.generated';
import { ConfigHeader } from './config-header';
import { ConfigRules } from './config-rules';

type DetailSensor = SensorDetailQuery['sensor'];

/** Loads the sensor's single alert rule and shares it with the header + rules. */
export function SensorConfig({ sensor }: { sensor: DetailSensor }) {
  // The rules section renders its own inline error, so skip the global toast.
  const { data, loading, error } = useQuery(SensorAlertRuleDocument, {
    variables: { sensorId: sensor.id },
    context: { suppressErrorToast: true },
  });
  const rule = data?.alertRule ?? null;

  return (
    <div className="flex flex-col gap-4">
      <ConfigHeader sensor={sensor} rule={rule} />
      <ConfigRules
        sensor={sensor}
        rule={rule}
        loading={loading && !data}
        error={error}
      />
    </div>
  );
}
