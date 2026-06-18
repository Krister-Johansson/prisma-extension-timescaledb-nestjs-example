import { type ApolloCache, type Reference } from '@apollo/client';

type EmulatorRef = { __typename: 'Emulator'; id: string };

/** Prepend a newly-created emulator to the cached list. */
export function addEmulatorToCache(
  cache: ApolloCache,
  emulator: EmulatorRef,
): void {
  cache.modify({
    fields: {
      emulators(existing: readonly Reference[] = [], { toReference, readField }) {
        const ref = toReference(emulator);
        if (!ref) return existing;
        const present = existing.some((e) => readField('id', e) === emulator.id);
        return present ? existing : [ref, ...existing];
      },
    },
  });
}

/** Drop an emulator from the cached list and evict its entity. */
export function removeEmulatorFromCache(cache: ApolloCache, id: string): void {
  cache.modify({
    fields: {
      emulators(existing: readonly Reference[] = [], { readField }) {
        return existing.filter((e) => readField('id', e) !== id);
      },
    },
  });
  cache.evict({ id: cache.identify({ __typename: 'Emulator', id }) });
  cache.gc();
}
