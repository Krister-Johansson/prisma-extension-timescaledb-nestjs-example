import { Outlet, createRootRoute } from '@tanstack/react-router';
import { ApolloProvider } from '@apollo/client/react';
import '../styles.css';
import '../lib/page-meta';
import { AppShell } from '@/components/layout/app-shell';
import { ThemeProvider } from '@/components/theme/theme';
import { apolloClient } from '@/lib/apollo';

export const Route = createRootRoute({
  staticData: { crumb: 'Dashboard' },
  component: RootComponent,
});

function RootComponent() {
  return (
    <ApolloProvider client={apolloClient}>
      <ThemeProvider>
        <AppShell>
          <Outlet />
        </AppShell>
      </ThemeProvider>
    </ApolloProvider>
  );
}
