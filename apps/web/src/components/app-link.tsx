import { Link } from '@tanstack/react-router';
import type { ComponentProps, ReactNode } from 'react';

type LinkTo = ComponentProps<typeof Link>['to'];

export interface AppLinkProps {
  /** An absolute path built by the `routes` registry (see lib/routes.ts). */
  to: string;
  children: ReactNode;
  className?: string;
  activeOptions?: ComponentProps<typeof Link>['activeOptions'];
}

/**
 * Thin wrapper over TanStack Router's `<Link>` that takes a path string from the
 * `routes` registry. The interop cast to TanStack's literal-path type lives here
 * only — the registry is our source of routing truth, so consumers stay ergonomic:
 *
 *   <AppLink to={routes.sensors.detail(id)}>Open</AppLink>
 */
export function AppLink({ to, children, ...rest }: AppLinkProps) {
  return (
    <Link to={to as LinkTo} {...rest}>
      {children}
    </Link>
  );
}
