import { type ApolloCache, type Reference } from '@apollo/client';

/**
 * Apollo cache helpers for the sensor CRUD optimistic updates. The mutation
 * result is already normalized by Apollo before its `update` runs; these only
 * fix up the root `sensors` list, which Apollo can't infer on its own.
 *
 * They run against both the optimistic layer and the real server result — the
 * optimistic layer is rolled back automatically if the mutation fails, so the
 * list reverts without any manual bookkeeping.
 */

type SensorRef = { __typename: 'Sensor'; id: string };

/** Prepend a newly-created sensor to the cached list (newest-first, like the API). */
export function addSensorToCache(cache: ApolloCache, sensor: SensorRef): void {
  cache.modify({
    fields: {
      sensors(existing: readonly Reference[] = [], { toReference, readField }) {
        const ref = toReference(sensor);
        if (!ref) return existing;
        const present = existing.some((e) => readField('id', e) === sensor.id);
        return present ? existing : [ref, ...existing];
      },
    },
  });
}

/** Drop a sensor from the cached list and evict its normalized entry. */
export function removeSensorFromCache(cache: ApolloCache, id: string): void {
  cache.modify({
    fields: {
      sensors(existing: readonly Reference[] = [], { readField }) {
        return existing.filter((e) => readField('id', e) !== id);
      },
    },
  });
  cache.evict({ id: cache.identify({ __typename: 'Sensor', id }) });
  cache.gc();
}
