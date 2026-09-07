import type { Metadata } from "next";
import Link from "next/link";

import { requestPasswordResetAction } from "@/app/forgot-password/actions";
import { AuthCard } from "@/components/auth/auth-card";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Reset your password"
      description="We will email a link to set a new one."
      footer={
        <Link
          href="/login"
          className="rounded underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          Back to sign in
        </Link>
      }
    >
      <ForgotPasswordForm action={requestPasswordResetAction} />
    </AuthCard>
  );
}
