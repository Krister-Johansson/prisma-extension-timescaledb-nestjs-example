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
    detail: (sensorId: string) => {
      const id = sensorId.trim();
      if (id.length === 0) {
        throw new Error('routes.sensors.detail requires a non-empty sensorId');
      }
      return path('sensors', id);
    },
  },
  aggregates: () => path('aggregates'),
  system: () => path('system'),
} as const;
