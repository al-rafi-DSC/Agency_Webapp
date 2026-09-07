/**
 * Role → route mapping, and the safe-redirect rule.
 *
 * Nothing in here is access control. It decides where to *send* someone;
 * Row Level Security decides what they can *read* once they arrive. Deleting
 * this file would make the app confusing to navigate and would not expose a
 * single extra row.
 */

import type { UserRole } from "@/types/db";

/** Where an account lands after signing in. */
export function homePathForRole(role: UserRole): string {
  switch (role) {
    case "admin":
    case "superadmin":
      // Superadmin has no workspace of its own yet — PRD §4.3 describes an
      // unlisted route, but its path is still an open question, so full-access
      // roles share the Admin workspace for now.
      return "/admin";
    case "staff":
      return "/staff";
  }
}

/** Which URL prefix a role is expected to be inside. */
export function canAccessWorkspace(role: UserRole, pathname: string): boolean {
  if (pathname.startsWith("/admin")) {
    return role === "admin" || role === "superadmin";
  }
  if (pathname.startsWith("/staff")) {
    // Admins can read every staff member's work, so the staff workspace is not
    // closed to them — the proxy still prefers to send them to /admin.
    return true;
  }
  return true;
}

/**
 * Sanitises a `?next=` value before redirecting to it.
 *
 * Without this, `/login?next=https://evil.example` makes the sign-in page an
 * open redirect: a phishing link that genuinely starts on the real domain,
 * shows the real login form, and bounces the user elsewhere after they
 * authenticate.
 *
 * Rules: must be root-relative, and must not start with `//` — `//evil.example`
 * is protocol-relative and a browser reads it as an absolute URL. Backslashes
 * are rejected too; some browsers normalise `/\evil.example` the same way.
 */
export function safeRedirectPath(
  next: string | null | undefined,
  fallback: string,
): string {
  if (!next) return fallback;
  if (!next.startsWith("/")) return fallback;
  if (next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
