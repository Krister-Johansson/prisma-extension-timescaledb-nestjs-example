// Per-route metadata for the header (title/subtitle) and breadcrumb trail,
// declared via TanStack Router `staticData` and read in the shell via useMatches.
declare module '@tanstack/react-router' {
  interface StaticDataRouteOption {
    title?: string;
    subtitle?: string;
    /** Breadcrumb label for this route (omit to skip in the trail). */
    crumb?: string;
  }
}

export {};
