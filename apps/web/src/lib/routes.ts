declare const routePathBrand: unique symbol;

/**
 * A path produced by the `routes` registry. Branding it means consumers (e.g.
 * `AppLink`) only accept registry-built paths — ad-hoc string literals won't
 * type-check, so the registry is the enforced single source of truth.
 */
export type RoutePath = string & { readonly [routePathBrand]: true };

/**
 * Build an absolute path from segments. Each segment is URL-encoded (so ids with
 * reserved characters are safe); empty segments are dropped. `path()` -> "/".
 */
function path(...segments: Array<string | number>): RoutePath {
  const joined = segments
    .map((segment) => encodeURIComponent(String(segment)))
    .filter((segment) => segment.length > 0)
    .join('/');
  return `/${joined}` as RoutePath;
}

function requireId(value: string, fn: string): string {
  const id = value.trim();
  if (id.length === 0) {
    throw new Error(`${fn} requires a non-empty sensorId`);
  }
  return id;
}

/**
 * Central route registry — the single source of truth for paths. Every leaf is a
 * pure function returning an absolute path, so callers pass only the params they
 * need and never hard-code path strings. Mirrors the SENTINEL dashboard pages.
 *
 *   routes.overview()              -> "/"
 *   routes.alerts()                -> "/alerts"
 *   routes.aggregates()            -> "/aggregates"
 *   routes.system()                -> "/system"
 *   routes.manage()                -> "/manage"
 *   routes.sensors.detail("t1")   -> "/sensors/t1"
 */
export const routes = {
  overview: () => path(),
  alerts: () => path('alerts'),
  anomalies: () => path('anomalies'),
  aggregates: () => path('aggregates'),
  system: () => path('system'),
  manage: () => path('manage'),
  emulators: () => path('emulators'),
  sensors: {
    detail: (sensorId: string) =>
      path('sensors', requireId(sensorId, 'routes.sensors.detail')),
  },
} as const;
