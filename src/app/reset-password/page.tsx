import type { Metadata } from "next";
import Link from "next/link";

import { updatePasswordAction } from "@/app/reset-password/actions";
import { AuthCard } from "@/components/auth/auth-card";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { SessionFromLink } from "@/app/reset-password/session-from-link";
import { isUiPreview } from "@/lib/supabase/env";
import { getAuthenticatedProfile } from "@/lib/supabase/session";

export const metadata: Metadata = { title: "Set a new password" };

/**
 * The end of both email flows — invite acceptance and password reset.
 *
 * Listed in `PUBLIC_ROUTES` in `src/proxy.ts`, but "public" there means "the
 * proxy does not demand a session before rendering it", not "anyone may use
 * it". The authorisation is the session that the emailed link established a
 * moment earlier, and `updatePasswordAction` re-checks it server-side before
 * changing anything.
 *
 * Two ways that session arrives, so two branches below:
 *   - a cookie, set server-side by /auth/callback (password resets, and
 *     invites once the dashboard email templates are configured)
 *   - a URL fragment, readable only in the browser (invites, by default —
 *     the SDK does not support PKCE for them). `SessionFromLink` handles it.
 */
export default async function ResetPasswordPage() {
  const hasSession = isUiPreview()
    ? true
    : (await getAuthenticatedProfile()) !== null;

  return (
    <AuthCard
      title="Set a new password"
      description="Choose a password you do not use anywhere else."
      footer={
        <Link
          href="/login"
          className="rounded underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          Back to sign in
        </Link>
      }
    >
      {hasSession ? (
        <ResetPasswordForm action={updatePasswordAction} />
      ) : (
        <SessionFromLink />
      )}
    </AuthCard>
  );
}
