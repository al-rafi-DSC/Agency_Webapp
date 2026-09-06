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

  if (user && pathname === "/login") {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/";
    homeUrl.search = "";
    return NextResponse.redirect(homeUrl);
  }

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
