import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client';

// Defaults to the same-origin `/graphql`, which the Vite dev server proxies to
// the API (see vite.config.ts). Set VITE_API_URL to hit the API directly.
const uri = import.meta.env.VITE_API_URL ?? '/graphql';

/** Single Apollo Client instance for the app (v4: HttpLink is explicit). */
export const apolloClient = new ApolloClient({
  link: new HttpLink({ uri }),
  cache: new InMemoryCache(),
});
