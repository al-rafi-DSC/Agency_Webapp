/**
 * Where emailed auth links land — both invites and password resets.
 *
 * ── Three link shapes, because Supabase genuinely sends three ────────────────
 *
 *   ?code=…                      PKCE  → exchangeCodeForSession()
 *   ?token_hash=…&type=invite    OTP   → verifyOtp()
 *   #access_token=…              implicit — NOT VISIBLE TO THIS FILE
 *
 * The third one is the trap. A URL fragment is never sent to the server, so
 * this route sees a bare request with no parameters at all. That is not a
 * broken link: it is what an **invite** looks like by default, because the
 * Supabase SDK does not support PKCE for `inviteUserByEmail` (the browser that
 * sends the invite is not the browser that accepts it, so there is no
 * code_verifier to pair with). Password resets do use PKCE and arrive as
 * `?code=`.
 *
 * So a parameterless request is forwarded to `next` unchanged — fragment and
 * all, which browsers reattach across a redirect — and the destination picks
 * the session up client-side. `/reset-password` does exactly that.
 *
 * Configuring the dashboard email templates to send `?token_hash=…` instead
 * keeps everything server-side and is the better setup; see supabase/README.md.
 * This route works either way, which is the point.
 */

import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { safeRedirectPath } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

const VALID_OTP_TYPES: readonly EmailOtpType[] = [
  "invite",
  "recovery",
  "signup",
  "email_change",
  "magiclink",
  "email",
];

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  // Sanitised the same way as the sign-in redirect: an emailed link is exactly
  // where someone would try to smuggle in an off-site destination.
  const next = safeRedirectPath(searchParams.get("next"), "/reset-password");

  // No server-readable credential. Either the tokens are in the fragment (an
  // invite) or the link is junk. Forward and let the destination decide —
  // /reset-password shows "link expired" if nothing turns up.
  if (!code && !tokenHash) {
    return NextResponse.redirect(new URL(next, origin));
  }

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
  } else if (tokenHash && isEmailOtpType(type)) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
  }

  // One destination for every failure — expired, already used, malformed,
  // wrong type. The login page reads `error` only to pick a generic sentence;
  // it never receives the underlying reason.
  return NextResponse.redirect(new URL("/login?error=link_invalid", origin));
}

function isEmailOtpType(value: string | null): value is EmailOtpType {
  return value !== null && VALID_OTP_TYPES.includes(value as EmailOtpType);
}
