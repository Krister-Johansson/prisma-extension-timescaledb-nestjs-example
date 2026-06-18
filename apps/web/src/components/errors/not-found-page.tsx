import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { routes } from '@/lib/routes';

/** App-wide 4xx page for unmatched routes (wired as defaultNotFoundComponent). */
export function NotFoundPage() {
  return (
    <div className="flex min-h-90 flex-col items-center justify-center rounded-[14px] border border-dashed border-border bg-card px-6 text-center">
      <div className="font-mono text-[11px] uppercase tracking-wide text-muted-2">
        404
      </div>
      <h1 className="mt-2 text-lg font-semibold">Page not found</h1>
      <p className="mt-1 max-w-md text-[12.5px] text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or may have moved.
      </p>
      <Button asChild size="sm" className="mt-4">
        <Link to={routes.overview() as never}>Back to dashboard</Link>
      </Button>
    </div>
  );
}
