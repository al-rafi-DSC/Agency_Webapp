import type { Metadata } from "next";

import { submitStaffRegistrationAction } from "@/app/join/actions";
import { AuthCard } from "@/components/auth/auth-card";
import { StaffRegistrationForm } from "@/components/auth/staff-registration-form";

export const metadata: Metadata = {
  title: "New staff details",
  robots: { index: false, follow: false },
};

/**
 * Unlisted on purpose: no page links here and search engines are told not to
 * index it. The Admin sends the link by hand (copied from Workers).
 *
 * It is not a sign-up: it sends the Admin a request. The account itself is
 * still created by the Admin.
 */
export default function JoinPage() {
  return (
    <AuthCard
      variant="glass"
      wide
      title="Join the team"
      description="Send your details to the Admin. They create your account — this form does not."
    >
      <StaffRegistrationForm action={submitStaffRegistrationAction} />
    </AuthCard>
  );
}
