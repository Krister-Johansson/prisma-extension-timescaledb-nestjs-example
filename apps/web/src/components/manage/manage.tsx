import { useQuery } from '@apollo/client/react';
import { QueryError } from '@/components/common/query-error';
import { GroupTree } from '@/components/group/group-tree';
import { SensorTypesPanel } from '@/components/sensor-type/sensor-types-panel';
import { SensorCreateDialog } from '@/components/sensor/sensor-create-dialog';
import { TableSensorEmpty } from '@/components/sensor/table-sensor-empty';
import { toUiSensors } from '@/data/sensor-adapter';
import { SensorsListDocument } from '@/graphql/sensors.generated';
import { TableManage } from './table-manage';
import { TableManageSkeleton } from './table-manage-skeleton';

export function Manage() {
  // Poll so the "last value" + "… ago" stay fresh as emulators ingest. This
  // screen renders its own QueryError panel, so skip the global toast.
  const { data, loading, error } = useQuery(SensorsListDocument, {
    pollInterval: 5000,
    context: { suppressErrorToast: true },
  });

  if (loading && !data) return <TableManageSkeleton />;
  if (error) return <QueryError message={error.message} />;

  const sensors = toUiSensors(data);
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <GroupTree />
        <SensorTypesPanel />
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">All sensors · {sensors.length}</h2>
        <SensorCreateDialog />
      </div>

      {sensors.length === 0 ? (
        <div className="overflow-hidden rounded-[14px] border border-border bg-card shadow-sm">
          <TableSensorEmpty />
        </div>
      ) : (
        <TableManage sensors={sensors} />
      )}

      <p className="text-xs leading-relaxed text-muted-2">
        Create, edit and delete sensors here. Changes apply optimistically — the
        table updates instantly and rolls back if the request fails.
      </p>
    </div>
  );
}
