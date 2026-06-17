import type { Sensor } from '@/data/types';
import { CardSensorEmpty } from './card-sensor-empty';
import { CardSensorItem } from './card-sensor-item';

export function CardSensor({ sensors }: { sensors: Sensor[] }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(310px,1fr))] gap-4">
      {sensors.length === 0 ? (
        <CardSensorEmpty />
      ) : (
        sensors.map((sensor) => (
          <CardSensorItem key={sensor.id} sensor={sensor} />
        ))
      )}
    </div>
  );
}
