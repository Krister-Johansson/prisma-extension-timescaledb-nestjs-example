import { useQuery } from '@apollo/client/react';
import { Link, useMatches, useParams } from '@tanstack/react-router';
import { Fragment } from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { SensorDetailDocument } from '@/graphql/sensors.generated';
import { routes, type RoutePath } from '@/lib/routes';

type Crumb = { label: string; to?: RoutePath };

type Match = ReturnType<typeof useMatches>[number];

/**
 * Builds the breadcrumb trail. The sensor page lives under "Manage" conceptually
 * (not in the route tree), so its trail is composed explicitly:
 *   Dashboard / Manage / Sensor / <name>   (detail)
 * The name comes from the live SensorDetail cache; until it resolves the trail
 * ends at `… / Sensor`. Other pages map their route `crumb`s directly.
 */
function buildCrumbs(
  matches: Match[],
  sensorId: string | undefined,
  sensorName: string | undefined,
): Crumb[] {
  if (sensorId) {
    const trail: Crumb[] = [
      { label: 'Dashboard', to: routes.overview() },
      { label: 'Manage', to: routes.manage() },
      { label: 'Sensor' },
    ];
    if (sensorName) trail.push({ label: sensorName });
    return trail;
  }

  const crumbed = matches.filter((m) => m.staticData.crumb);
  return crumbed.map((m, i) => ({
    label: m.staticData.crumb as string,
    // Intermediate crumbs link to their own path; the last is the current page.
    to: i < crumbed.length - 1 ? (m.pathname as RoutePath) : undefined,
  }));
}

export function AppBreadcrumb() {
  const matches = useMatches();
  const params = useParams({ strict: false }) as { sensorId?: string };
  const sensorId = params.sensorId;

  const { data } = useQuery(SensorDetailDocument, {
    variables: { id: sensorId ?? '' },
    skip: !sensorId,
    fetchPolicy: 'cache-first',
    // Background lookup for the label — never toast on failure.
    context: { suppressErrorToast: true },
  });

  const crumbs = buildCrumbs(matches, sensorId, data?.sensor?.name);
  if (crumbs.length === 0) return null;

  return (
    <Breadcrumb className="mb-[18px]">
      <BreadcrumbList>
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <Fragment key={`${index}-${crumb.label}`}>
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : crumb.to ? (
                  <BreadcrumbLink asChild>
                    <Link to={crumb.to as never}>{crumb.label}</Link>
                  </BreadcrumbLink>
                ) : (
                  crumb.label
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
