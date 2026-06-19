import { Outlet, createRootRoute } from '@tanstack/react-router';
import { ApolloProvider } from '@apollo/client/react';
import '../styles.css';
import '../lib/page-meta';
import { AiLauncher } from '@/components/ai-chat/ai-launcher';
import { AlertToaster } from '@/components/alerts/alert-toaster';
import { AppShell } from '@/components/layout/app-shell';
import { ThemeProvider } from '@/components/theme/theme';
import { Toaster } from '@/components/ui/sonner';
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
        <AiLauncher />
        <AlertToaster />
        <Toaster />
      </ThemeProvider>
    </ApolloProvider>
  );
}
