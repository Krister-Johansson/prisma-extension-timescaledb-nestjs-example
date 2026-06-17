import { SENSORS } from '@/data/sensors';
import { OverviewKpis } from './overview-kpis';
import { OverviewSensors } from './overview-sensors';

export function Overview() {
  const sensors = SENSORS;
  return (
    <>
      <OverviewKpis sensors={sensors} />
      <OverviewSensors sensors={sensors} />
    </>
  );
}
