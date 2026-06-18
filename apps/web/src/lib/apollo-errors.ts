import type { ErrorLike } from '@apollo/client';
import { CombinedGraphQLErrors, ServerError } from '@apollo/client/errors';

/**
 * Turn any Apollo error into a short, human-readable message for a toast.
 *
 * - GraphQL errors carry server-authored messages (our NestJS API returns
 *   things like "Record not found"), so we surface the first one directly.
 * - Server (non-2xx) and network/parse errors get a friendly generic message
 *   since their raw text isn't user-facing.
 */
export function humanizeApolloError(error: ErrorLike): string {
  if (CombinedGraphQLErrors.is(error)) {
    return error.errors[0]?.message ?? 'Something went wrong.';
  }
  if (ServerError.is(error)) {
    return 'The server returned an error. Please try again.';
  }
  return "Couldn't reach the server. Check your connection and try again.";
}

/** Operation context flag: set `{ suppressErrorToast: true }` on a query/mutation
 * whose component renders its own error state, so the global link skips the toast
 * (it still logs). */
export interface ErrorToastContext {
  suppressErrorToast?: boolean;
}
