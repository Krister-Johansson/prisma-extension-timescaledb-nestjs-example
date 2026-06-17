import type { Sensor } from '@/data/types';
import { ConfigHeader } from './config-header';
import { ConfigRules } from './config-rules';

export function SensorConfig({ sensor }: { sensor: Sensor }) {
  return (
    <div className="flex flex-col gap-4">
      <ConfigHeader sensor={sensor} />
      <ConfigRules sensor={sensor} />
    </div>
  );
}
