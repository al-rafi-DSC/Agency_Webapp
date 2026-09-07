import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { signInAction } from "@/app/login/actions";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RESET_LINK_INVALID } from "@/lib/auth/messages";
import { homePathForRole, safeRedirectPath } from "@/lib/auth/roles";
import { getSessionUser } from "@/lib/auth/session";
import { isUiPreview } from "@/lib/supabase/env";

export const metadata: Metadata = { title: "Sign in" };

/**
 * Sign in (PRD §7).
 *
 * What matters on this page is as much what it does NOT offer: there is no
 * "create an account" link, because accounts exist only by Admin invite. That
 * is a product decision, so it is stated in the footer rather than left as a
 * missing button somebody later "fixes".
 *
 * `?error=link_invalid` is the single failure marker /auth/callback sets. It
 * carries no detail about why a link failed, on purpose.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;

  // Bouncing an already-signed-in visitor is done HERE rather than in
  // `src/proxy.ts`, so that exactly one place decides what "signed in" means.
  // The proxy can only see whether a cookie is valid; this can see whether the
  // account still has an active profile. If both redirected on different
  // answers, a deactivated account holding an unexpired token would ping-pong
  // between / and /login forever.
  //
  // Skipped in preview mode, where getSessionUser() always returns a fixture
  // and would make the login screen unreachable.
  if (!isUiPreview()) {
    const user = await getSessionUser();
    if (user) {
      redirect(safeRedirectPath(params.next ?? null, homePathForRole(user.role)));
    }
  }

  // Sanitised here as well as in the action. The action's check is the one
  // that matters; this one keeps a hostile value from being echoed into the
  // rendered markup at all.
  const next = safeRedirectPath(params.next ?? null, "");
  const linkFailed = params.error === "link_invalid";

  return (
    <AuthCard
      title="Sign in"
      description="Use the email address your workspace invite was sent to."
      footer={
        <p>
          No account? Accounts are created by the Admin — there is no public
          sign-up. Ask them for an invite.
        </p>
      }
    >
      {linkFailed ? (
        <Alert className="mb-4">
          <AlertDescription>{RESET_LINK_INVALID}</AlertDescription>
        </Alert>
      ) : null}

      <LoginForm
        action={signInAction}
        forgotPasswordHref="/forgot-password"
        next={next || undefined}
      />
    </AuthCard>
  );
}
