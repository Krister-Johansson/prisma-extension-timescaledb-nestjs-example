import {
  ApolloClient,
  ApolloLink,
  HttpLink,
  InMemoryCache,
  from,
} from '@apollo/client';
import { ErrorLink } from '@apollo/client/link/error';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { createClient } from 'graphql-ws';
import { toast } from 'sonner';
import { type ErrorToastContext, humanizeApolloError } from './apollo-errors';

// Defaults to the same-origin `/graphql`, which the Vite dev server proxies to
// the API (see vite.config.ts). Set VITE_API_URL to hit the API directly.
const uri = import.meta.env.VITE_API_URL ?? '/graphql';
// WebSocket endpoint for subscriptions (same-origin /graphql, proxied with
// `ws: true`). Set VITE_WS_URL to point at the API directly.
const wsUri =
  import.meta.env.VITE_WS_URL ??
  `${window.location.origin.replace(/^http/, 'ws')}/graphql`;

/**
 * One place for every Apollo error: log the full detail to the console (always,
 * for debugging) and show a human-readable toast. A component that renders its
 * own error state opts out of the toast with `context: { suppressErrorToast: true }`.
 */
const errorLink = new ErrorLink(({ error, operation }) => {
  const name = operation.operationName ?? 'anonymous';
  console.error(`[Apollo] ${name} failed:`, error);

  const { suppressErrorToast } = operation.getContext() as ErrorToastContext;
  if (suppressErrorToast) return;

  const message = humanizeApolloError(error);
  // Dedupe by operation + message so a burst of the same error shows once.
  toast.error(message, { id: `${name}:${message}` });
});

const httpLink = new HttpLink({ uri });
const wsLink = new GraphQLWsLink(createClient({ url: wsUri }));

// Route subscriptions over the WebSocket link; queries/mutations over HTTP.
const transport = ApolloLink.split(
  ({ query }) => {
    const def = getMainDefinition(query);
    return (
      def.kind === 'OperationDefinition' && def.operation === 'subscription'
    );
  },
  wsLink,
  httpLink,
);

/** Single Apollo Client instance for the app (v4: links are explicit). */
export const apolloClient = new ApolloClient({
  link: from([errorLink, transport]),
  cache: new InMemoryCache(),
});
