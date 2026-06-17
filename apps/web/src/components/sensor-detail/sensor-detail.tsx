import type { Sensor } from '@/data/types';
import { DetailAlertHistory } from './detail-alert-history';
import { DetailHourlyChart } from './detail-hourly-chart';
import { DetailRawChart } from './detail-raw-chart';
import { DetailRuleCard } from './detail-rule-card';
import { SensorPills } from './sensor-pills';
import { TableHourly } from './table-hourly';
import { TableReadings } from './table-readings';

export function SensorDetail({ sensor }: { sensor: Sensor }) {
  return (
    <div className="flex flex-col gap-4">
      <SensorPills activeId={sensor.id} />
      <DetailRawChart sensor={sensor} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.55fr_1fr]">
        <DetailHourlyChart sensor={sensor} />
        <DetailRuleCard sensor={sensor} />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TableReadings sensor={sensor} />
        <TableHourly sensor={sensor} />
      </div>
      <DetailAlertHistory sensor={sensor} />
    </div>
  );
}
