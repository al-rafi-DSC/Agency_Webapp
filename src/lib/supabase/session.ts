import "server-only";

/**
 * Reads the signed-in account's profile row. Supabase only — no fixtures, no
 * preview handling. `@/lib/auth/session` is the app-facing wrapper that layers
 * preview mode and the inactive-account rule on top of this.
 *
 * `import "server-only"` turns any accidental import from a Client Component
 * into a build error rather than a runtime leak.
 */

import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/db";
import type { SessionUser } from "@/types/ui";

/** `profiles`, as this file reads it. Mirrors the migration. */
export interface AuthenticatedProfile extends SessionUser {
  status: "active" | "inactive";
}

const PROFILE_COLUMNS = "id, email, full_name, role, status, avatar_url";

/**
 * The signed-in account's profile, or null.
 *
 * Null covers three cases, and they are deliberately indistinguishable to
 * callers: no session, an invalid session, and a session whose account has no
 * profile row. The last one should be impossible — `on_auth_user_created`
 * creates the row — but if it ever happens, the account has no role, and an
 * account with no role must not be treated as having one.
 */
export async function getAuthenticatedProfile(): Promise<AuthenticatedProfile | null> {
  const supabase = await createClient();

  // getUser() revalidates against Supabase. Never getSession(), which trusts
  // an unverified cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id as string,
    email: (data.email as string) || (user.email ?? ""),
    full_name: (data.full_name as string) || "",
    role: data.role as UserRole,
    avatar_url: (data.avatar_url as string | null) ?? null,
    status: data.status as "active" | "inactive",
  };
}
