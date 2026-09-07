"use server";

/**
 * Request a password reset link.
 *
 * ── The response never varies ────────────────────────────────────────────────
 * Same confirmation whether the address has an account or not, and the same
 * confirmation when Supabase refuses the send. That last one matters more than
 * it looks: Supabase rate-limits per address, so surfacing "too many requests"
 * would confirm the address exists just as reliably as an explicit message
 * would. The only thing this action ever reports is that a request was
 * received.
 *
 * ⚠ Supabase's default mailer is capped near 2 emails/hour (CLAUDE.md). Until
 * custom SMTP is configured, this action will report success for mail that was
 * never delivered — which is correct behaviour for the reason above, and a
 * genuine operational problem. Configure SMTP before relying on resets.
 */

import { headers } from "next/headers";

import { EMAIL_REQUIRED, PASSWORD_RESET_SENT } from "@/lib/auth/messages";
import { createClient } from "@/lib/supabase/server";

export interface ResetRequestState {
  error: string | null;
  sent: boolean;
  message: string | null;
}

export async function requestPasswordResetAction(
  _prevState: ResetRequestState,
  formData: FormData,
): Promise<ResetRequestState> {
  const email = String(formData.get("email") ?? "").trim();

  if (email.length === 0) {
    return { error: EMAIL_REQUIRED, sent: false, message: null };
  }

  const origin = await requestOrigin();
  const supabase = await createClient();

  // Result deliberately ignored — see the file header.
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/reset-password")}`,
  });

  return { error: null, sent: true, message: PASSWORD_RESET_SENT };
}

/**
 * The origin to build the emailed link from.
 *
 * Reads the forwarded headers Vercel sets, so a preview deployment sends links
 * back to itself rather than to production. Whatever this returns must also be
 * on Supabase's redirect allowlist (Authentication → URL Configuration) or the
 * link is rejected when it is clicked, not when it is sent.
 */
async function requestOrigin() {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const protocol =
    headerList.get("x-forwarded-proto") ??
    (host?.startsWith("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}
