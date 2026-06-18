import { DetailReadingsChart } from './detail-readings-chart';
import { DetailTabs } from './detail-tabs';
import { useReadingsBuckets } from './use-readings-buckets';

/**
 * Owns the shared readings query/window and renders the chart with the
 * Data / Alerts tabs below it — both driven by the same URL-backed state.
 */
export function DetailReadings({
  sensorId,
  unit,
}: {
  sensorId: string;
  unit: string;
}) {
  const data = useReadingsBuckets(sensorId);

  return (
    <div className="flex flex-col gap-4">
      <DetailReadingsChart data={data} sensorId={sensorId} unit={unit} />
      <DetailTabs data={data} sensorId={sensorId} unit={unit} />
    </div>
  );
}
