import "server-only";

/**
 * The one function application code calls to learn who is signed in.
 *
 * Sits on top of `@/lib/supabase/session` and adds the two rules that are
 * product decisions rather than database facts:
 *
 *   1. UI preview mode returns a fixture identity instead of querying Supabase.
 *   2. A deactivated account is treated as not signed in.
 *
 * ── This is not the access-control boundary ──────────────────────────────────
 * It answers "who is this?", never "may they see this row?". Row Level
 * Security answers the second question, at the database, on every code path
 * (PRD §7). A bug here shows the wrong name in the topbar; it does not leak a
 * student file.
 */

import { redirect } from "next/navigation";

import { homePathForRole } from "@/lib/auth/roles";
import { isUiPreview } from "@/lib/supabase/env";
import { getAuthenticatedProfile } from "@/lib/supabase/session";
import type { UserRole } from "@/types/db";
import type { SessionUser } from "@/types/ui";

/**
 * @param previewAs Which fixture identity to return in UI preview mode. Has no
 *   effect outside preview — it cannot be used to assume a role against a real
 *   Supabase project, because `isUiPreview()` is hard-gated on a non-production
 *   NODE_ENV.
 */
export async function getSessionUser({
  previewAs,
}: {
  previewAs?: UserRole;
} = {}): Promise<SessionUser | null> {
  if (isUiPreview()) {
    // Dynamically imported so the fixtures never enter the production module
    // graph at all — `src/lib/mock/students.ts` is explicit that it must not be
    // reachable from a production data path, and a static import would put it
    // there regardless of whether this branch ever runs.
    const { getMockSessionUser } = await import("@/lib/mock/students");
    // The fixtures cover admin and staff only. Superadmin has no workspace of
    // its own yet (PRD §4.3 — the route's path is still an open question), so
    // previewing it means previewing the Admin workspace.
    return getMockSessionUser(previewAs === "staff" ? "staff" : "admin");
  }

  const profile = await getAuthenticatedProfile();
  if (!profile) return null;

  // Staff departure: an inactive account is refused, immediately, everywhere
  // that asks who is signed in. Enforced here rather than in the proxy because
  // this is the layer that actually reads the table — the proxy only has the
  // JWT, and a status cached in a token is stale for up to an hour, which is
  // exactly the window that matters when someone has just left.
  if (profile.status === "inactive") return null;

  // Built field by field rather than spread-minus-status: `status` is an
  // internal gate, and SessionUser is handed to Client Components. Listing the
  // fields keeps a future column on `profiles` from being shipped to the
  // browser by accident.
  return {
    id: profile.id,
    email: profile.email,
    full_name: profile.full_name,
    role: profile.role,
    avatar_url: profile.avatar_url,
  };
}

/**
 * Session or bust. Redirects to /login, preserving where they were going.
 *
 * Server Components only — `redirect()` throws, which is how Next unwinds the
 * render, so never wrap a call to this in a try/catch that swallows errors.
 */
export async function requireSessionUser(options?: {
  previewAs?: UserRole;
  next?: string;
}): Promise<SessionUser> {
  const user = await getSessionUser({ previewAs: options?.previewAs });
  if (!user) {
    const target = options?.next
      ? `/login?next=${encodeURIComponent(options.next)}`
      : "/login";
    redirect(target);
  }
  return user;
}

/**
 * Session, and one of these roles.
 *
 * DEFENCE IN DEPTH, NOT THE BOUNDARY. A staff account that somehow renders an
 * admin screen still cannot read another staff member's students, because RLS
 * refuses the rows. This exists so the wrong screen does not render at all —
 * a redirect is a better experience than a page full of empty states.
 */
export async function requireRole(
  roles: readonly UserRole[],
  options?: { previewAs?: UserRole; next?: string },
): Promise<SessionUser> {
  const user = await requireSessionUser(options);
  if (!roles.includes(user.role)) {
    redirect(homePathForRole(user.role));
  }
  return user;
}
