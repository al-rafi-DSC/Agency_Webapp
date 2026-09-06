import "server-only";

/**
 * Server Supabase client — Server Components, Route Handlers, Server Actions.
 *
 * Uses the anon key with the caller's session cookie, so every query runs AS
 * THE LOGGED-IN USER and Row Level Security applies. This is the default client
 * for all student data access (PRD §7).
 *
 * `import "server-only"` above turns any accidental import from a Client
 * Component into a build error rather than a runtime leak.
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { requireSupabasePublicEnv } from "@/lib/supabase/env";

export async function createClient() {
  const { url, anonKey } = requireSupabasePublicEnv();
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // `middleware.ts` refreshes the session, so this is safe to ignore.
        }
      },
    },
  });
}

/** The currently authenticated user, or null. Always verified server-side. */
export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
