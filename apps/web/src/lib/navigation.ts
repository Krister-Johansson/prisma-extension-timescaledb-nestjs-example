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
