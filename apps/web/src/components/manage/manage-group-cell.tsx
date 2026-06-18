import { useMutation, useQuery } from '@apollo/client/react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Sensor } from '@/data/types';
import {
  AssignSensorToGroupDocument,
  SensorGroupsDocument,
} from '@/graphql/sensors.generated';

const NONE = '__none__';

/** Per-row group picker. The mutation returns the sensor's new `groupId`, which
 * Apollo writes back to the normalized cache (so the row updates); refetching
 * SensorGroups keeps the tree's sensor counts in sync. */
export function ManageGroupCell({ sensor }: { sensor: Sensor }) {
  const { data } = useQuery(SensorGroupsDocument, {
    context: { suppressErrorToast: true },
  });
  const [assign, { loading }] = useMutation(AssignSensorToGroupDocument, {
    refetchQueries: ['SensorGroups'],
  });

  const groups = data?.sensorGroups ?? [];

  return (
    // Stop row navigation when interacting with the picker (events bubble through
    // the React tree, even from the portaled menu).
    <span
      className="contents"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <Select
        value={sensor.groupId ?? NONE}
        disabled={loading}
        onValueChange={(v) =>
          assign({
            variables: {
              sensorId: sensor.id,
              groupId: v === NONE ? null : v,
            },
          })
        }
      >
        <SelectTrigger size="sm" className="h-7 w-[150px] text-[12px]">
          <SelectValue placeholder="No group" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>No group</SelectItem>
          {groups.map((g) => (
            <SelectItem key={g.id} value={g.id}>
              {g.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </span>
  );
}
