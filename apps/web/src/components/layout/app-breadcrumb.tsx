import { useMatches } from '@tanstack/react-router';

export function AppBreadcrumb() {
  const matches = useMatches();
  const crumbs = matches
    .filter((m) => m.staticData.crumb)
    .map((m) => ({ id: m.id, label: m.staticData.crumb as string }));

  if (crumbs.length === 0) return null;

  return (
    <nav className="mb-[18px] flex flex-wrap items-center gap-2">
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;
        return (
          <span key={crumb.id} className="flex items-center gap-2">
            {index > 0 ? (
              <span className="text-[13px] text-muted-2">/</span>
            ) : null}
            <span
              className={
                isLast
                  ? 'text-[12.5px] font-semibold text-foreground'
                  : 'text-[12.5px] font-medium text-muted-foreground'
              }
            >
              {crumb.label}
            </span>
          </span>
        );
      })}
    </nav>
  );
}
