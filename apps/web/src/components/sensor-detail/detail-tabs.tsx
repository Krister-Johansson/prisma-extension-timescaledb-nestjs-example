import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { useSearchState } from '@/lib/use-search-state';
import type { TabKey } from './chart-params';
import { DetailAlertHistory } from './detail-alert-history';
import { DetailDataTable } from './detail-data-table';
import type { ReadingsBuckets } from './use-readings-buckets';

export function DetailTabs({
  data,
  sensorId,
  unit,
}: {
  data: ReadingsBuckets;
  sensorId: string;
  unit: string;
}) {
  const [{ tab }, setSearch] = useSearchState('/sensors/$sensorId/');

  return (
    <Tabs value={tab} onValueChange={(v) => setSearch({ tab: v as TabKey })}>
      <TabsList>
        <TabsTrigger value="data">Data</TabsTrigger>
        <TabsTrigger value="alert">Alerts</TabsTrigger>
      </TabsList>
      <TabsContent value="data" className="mt-3">
        <DetailDataTable
          buckets={data.buckets}
          res={data.res}
          unit={unit}
          loading={data.loading}
          error={data.error}
          tooMany={data.tooMany}
        />
      </TabsContent>
      <TabsContent value="alert" className="mt-3">
        <DetailAlertHistory sensorId={sensorId} unit={unit} />
      </TabsContent>
    </Tabs>
  );
}
