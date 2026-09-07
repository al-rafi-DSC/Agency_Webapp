import type { Metadata } from "next";

import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Sign in" };

/**
 * Sign in (PRD §7).
 *
 * The form does not authenticate — see `login-form.tsx`. What matters on this
 * page is what it does NOT offer: there is no "create an account" link, because
 * accounts exist only by Admin invite. That is a product decision, so it is
 * stated on the page rather than left as a missing button.
 */
export default function LoginPage() {
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
      <LoginForm forgotPasswordHref="/forgot-password" />
    </AuthCard>
  );
}
