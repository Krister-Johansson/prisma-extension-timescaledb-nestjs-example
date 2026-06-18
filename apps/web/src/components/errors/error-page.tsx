import { useRouter } from '@tanstack/react-router';
import { TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * App-wide 5xx page for uncaught render/loader errors (wired as
 * defaultErrorComponent). "Try again" re-runs loaders and resets the boundary.
 */
export function ErrorPage({ error }: { error: Error }) {
  const router = useRouter();
  return (
    <div className="flex min-h-90 flex-col items-center justify-center rounded-[14px] border border-[color-mix(in_srgb,var(--alert)_40%,var(--border))] bg-card px-6 text-center">
      <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-alert-bg">
        <TriangleAlert className="size-5 text-alert" />
      </div>
      <div className="font-mono text-[11px] uppercase tracking-wide text-muted-2">
        Error
      </div>
      <h1 className="mt-1 text-lg font-semibold">Something went wrong</h1>
      <p className="mt-1 max-w-md text-[12.5px] text-muted-foreground">
        {error.message ||
          'An unexpected error occurred while rendering this page.'}
      </p>
      <Button size="sm" className="mt-4" onClick={() => void router.invalidate()}>
        Try again
      </Button>
    </div>
  );
}
