/**
 * Build an absolute path from segments. Numbers are stringified; empty segments
 * are dropped. `path()` -> "/", `path('sensors', 1)` -> "/sensors/1".
 */
function path(...segments: Array<string | number>): string {
  const joined = segments
    .map((segment) => String(segment))
    .filter((segment) => segment.length > 0)
    .join('/');
  return `/${joined}`;
}

/**
 * Central route registry — the single source of truth for paths. Every leaf is a
 * pure function returning an absolute path, so callers pass only the params they
 * need and never hard-code path strings. Refactoring a URL touches one place.
 *
 *   routes.home()                -> "/"
 *   routes.sensors.index()       -> "/sensors"
 *   routes.sensors.detail("t1")  -> "/sensors/t1"
 *   routes.aggregates()          -> "/aggregates"
 *   routes.system()              -> "/system"
 *
 * Nest deeper as the app grows, e.g. `routes.sensors.alert.edit(id)`.
 */
export const routes = {
  home: () => path(),
  sensors: {
    index: () => path('sensors'),
    detail: (sensorId: string) => path('sensors', sensorId),
  },
  aggregates: () => path('aggregates'),
  system: () => path('system'),
} as const;
