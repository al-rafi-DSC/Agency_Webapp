/**
 * Edge proxy (Next.js 16's replacement for `middleware.ts`).
 *
 * Two jobs:
 *   1. Refresh the Supabase auth session cookie on every request, so Server
 *      Components never see a stale session.
 *   2. Fail CLOSED — an unauthenticated request to anything other than the
 *      public routes below is redirected to /login.
 *
 * This is a convenience layer, NOT the access control boundary. Staff scoping
 * is enforced by Row Level Security in the database (PRD §7); a redirect here
 * only decides what gets rendered, never what data a query may return.
 *
 * ── What this file deliberately does NOT do ──────────────────────────────────
 * It does not check roles. Role routing lives in the layouts and in `/`, which
 * can read `profiles.role` — the authority. Doing it here would mean either a
 * database round-trip on every single request, or trusting a JWT claim that
 * drifts out of step with the table the moment an Admin changes someone's
 * role. Neither is worth it to save one server render.
 *
 * Hand-written and off-limits to generated UI work — see AGENTS.md.
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { isUiPreview, requireSupabasePublicEnv } from "@/lib/supabase/env";

/** Routes reachable without a session. Everything else requires one. */
const PUBLIC_ROUTES = ["/login", "/auth", "/forgot-password", "/reset-password"];

function isPublicRoute(pathname: string) {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export default async function proxy(request: NextRequest) {
  // UI preview mode: no Supabase project, no login, screens render from mock
  // fixtures. Impossible to enable in a production build — see isUiPreview().
  if (isUiPreview()) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const { url, anonKey } = requireSupabasePublicEnv();
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // getUser() revalidates against Supabase. Do not swap it for getSession(),
  // which trusts an unverified cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && !isPublicRoute(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // NOTE: signing an already-authenticated visitor away from /login is done by
  // the login PAGE, not here, and that is deliberate.
  //
  // This function can only ask Supabase Auth "is this cookie valid?". The rest
  // of the app asks a different and stricter question through
  // `getSessionUser()`: valid cookie AND a profile row AND status = 'active'.
  // A departed staff member holding an unexpired access token answers yes to
  // the first and no to the second.
  //
  // If both places redirected, those two answers would disagree and bounce the
  // browser between /login and / forever. One source of truth, one redirect:
  // the page, which can read the profile.

  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except Next.js internals and static assets. Kept broad on
     * purpose: a new route is protected by default and has to be added to
     * PUBLIC_ROUTES to become public, rather than the other way round.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
