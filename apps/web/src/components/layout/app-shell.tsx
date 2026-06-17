import type { ReactNode } from 'react';
import { AppBreadcrumb } from './app-breadcrumb';
import { AppHeader } from './app-header';
import { AppSidebar } from './app-sidebar';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <AppSidebar />
      <main className="flex min-w-0 flex-1 flex-col">
        <AppHeader />
        <div className="flex-1 px-7 pb-10 pt-6">
          <AppBreadcrumb />
          {children}
        </div>
      </main>
    </div>
  );
}
