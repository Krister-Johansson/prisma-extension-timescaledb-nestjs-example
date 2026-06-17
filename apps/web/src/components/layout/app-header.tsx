import { useMatches } from '@tanstack/react-router';
import { ThemeToggle } from '@/components/theme/theme';

export function AppHeader() {
  const matches = useMatches();
  const meta = [...matches].reverse().find((m) => m.staticData.title);
  const title = meta?.staticData.title ?? 'SENTINEL';
  const subtitle = meta?.staticData.subtitle;

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-5 border-b border-border bg-background/80 px-7 py-4 backdrop-blur">
      <div className="min-w-0 leading-tight">
        <div className="truncate text-[19px] font-bold tracking-tight">
          {title}
        </div>
        {subtitle ? (
          <div className="truncate text-[13px] text-muted-foreground">
            {subtitle}
          </div>
        ) : null}
      </div>
      <div className="flex flex-none items-center gap-3.5">
        <div className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5">
          <span className="size-[7px] animate-pulse rounded-full bg-ok" />
          <span className="font-mono text-[11.5px] font-medium text-muted-foreground">
            LIVE
          </span>
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
