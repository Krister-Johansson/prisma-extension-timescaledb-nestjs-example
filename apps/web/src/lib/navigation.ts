import type { KeyboardEvent } from 'react';
import { useNavigate } from '@tanstack/react-router';
import type { RoutePath } from './routes';

/**
 * Imperative navigation to a registry-built path. The interop cast to TanStack's
 * literal-path typing is isolated here (mirrors AppLink for declarative links).
 */
export function useGoTo(): (to: RoutePath) => void {
  const navigate = useNavigate();
  return (to) => {
    void navigate({ to: to as never });
  };
}

/**
 * Props that turn a non-anchor element (e.g. a table row) into a keyboard- and
 * mouse-accessible link to a registry path: click + Enter/Space activation,
 * focusable, with button semantics. Pair with a `focus-visible` ring class.
 */
export function useRowLinkProps() {
  const goTo = useGoTo();
  return (to: RoutePath) => ({
    role: 'button' as const,
    tabIndex: 0,
    onClick: () => goTo(to),
    onKeyDown: (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        goTo(to);
      }
    },
  });
}
