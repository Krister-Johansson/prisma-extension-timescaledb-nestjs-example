import {
  getRouteApi,
  type RegisteredRouter,
  type RouteIds,
} from '@tanstack/react-router';
import { useCallback } from 'react';

type RouteId = RouteIds<RegisteredRouter['routeTree']>;

/**
 * Read + update a route's validated search params with full type-safety.
 *
 * Returns a `[search, setSearch]` tuple (like `useState`). `search` is the
 * route's validated params; `setSearch` merges a partial patch (object or
 * updater fn) onto the current params and writes them to the URL, so unrelated
 * params are preserved and the URL stays shareable. Defaults to `replace` so
 * incidental control changes don't spam history — pass `{ replace: false }` to
 * push instead.
 *
 * Reusable on any route that defines `validateSearch`; the route id keeps it
 * fully typed end to end.
 */
export function useSearchState<TId extends RouteId>(routeId: TId) {
  const routeApi = getRouteApi(routeId);
  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();

  type Search = typeof search;

  const setSearch = useCallback(
    (
      patch: Partial<Search> | ((prev: Search) => Partial<Search>),
      options?: { replace?: boolean },
    ) => {
      navigate({
        // The public `setSearch` signature above is fully typed; this internal
        // call is cast because TanStack's per-route NavigateOptions can't be
        // constructed from a generic route id.
        search: ((prev: Search) => ({
          ...prev,
          ...(typeof patch === 'function' ? patch(prev) : patch),
        })) as never,
        replace: options?.replace ?? true,
        // These are in-place control updates (filters, tabs, chart window) —
        // keep the current scroll position instead of jumping to the top.
        resetScroll: false,
      });
    },
    [navigate],
  );

  return [search, setSearch] as const;
}
