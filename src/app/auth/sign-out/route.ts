/**
 * Sign out. POST only.
 *
 * ── Why not a link ───────────────────────────────────────────────────────────
 * The previous UI signed out with `<Link href="/login">`, which ended no
 * session at all. The fix is not "make that link hit a GET route": Next
 * prefetches links on hover, so a GET that mutates would sign people out for
 * pointing at the menu. A state-changing request is a POST, and React's form
 * handling gives CSRF protection that a bare GET does not.
 */

import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // `scope: "global"` revokes every refresh token for the account, not just
  // this browser's. Signing out on a shared machine should not leave a session
  // alive on another one.
  await supabase.auth.signOut({ scope: "global" });

  const response = NextResponse.redirect(
    new URL("/login", request.nextUrl.origin),
    // 303 so the browser follows with GET. A 307 would replay the POST against
    // /login.
    { status: 303 },
  );

  return response;
}
