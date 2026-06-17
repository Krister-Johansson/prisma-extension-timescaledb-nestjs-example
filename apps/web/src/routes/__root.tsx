import { Outlet, createRootRoute } from '@tanstack/react-router';
import '../styles.css';
import '../lib/page-meta';
import { AppShell } from '@/components/layout/app-shell';
import { ThemeProvider } from '@/components/theme/theme';

export const Route = createRootRoute({
  staticData: { crumb: 'Dashboard' },
  component: RootComponent,
});

function RootComponent() {
  return (
    <ThemeProvider>
      <AppShell>
        <Outlet />
      </AppShell>
    </ThemeProvider>
  );
}
