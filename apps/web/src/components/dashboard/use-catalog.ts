import { useQuery } from '@apollo/client/react';
import { useMemo } from 'react';
import { WidgetCatalogDocument } from '@/graphql/widget-data.generated';

/** Sensors / groups / types for widget config pickers + label/unit lookups.
 * Cached by Apollo so all widgets share one fetch. */
export function useCatalog() {
  const { data, loading } = useQuery(WidgetCatalogDocument);
  return useMemo(() => {
    const sensors = data?.sensors ?? [];
    const groups = data?.sensorGroups ?? [];
    const types = data?.sensorTypes ?? [];
    return {
      sensors,
      groups,
      types,
      loading,
      sensorById: new Map(sensors.map((s) => [s.id, s])),
      groupById: new Map(groups.map((g) => [g.id, g])),
      typeByKey: new Map(types.map((t) => [t.key, t])),
    };
  }, [data, loading]);
}
