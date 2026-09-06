/**
 * Browser Supabase client — Client Components only.
 *
 * Uses the anon key. Every read AND write made through this client is governed
 * by Row Level Security. The anon key is not read-only: it can insert, update
 * and delete anywhere a policy permits, so write policies need the same
 * scrutiny as read policies (CLAUDE.md § Environment Variables).
 *
 * Prefer Server Components + `@/lib/supabase/server` for data fetching. Reach
 * for this only when you genuinely need Supabase in the browser (realtime
 * subscriptions, auth state changes, client-side file upload).
 */

import { createBrowserClient } from "@supabase/ssr";

import { requireSupabasePublicEnv } from "@/lib/supabase/env";

export function createClient() {
  const { url, anonKey } = requireSupabasePublicEnv();
  return createBrowserClient(url, anonKey);
}
