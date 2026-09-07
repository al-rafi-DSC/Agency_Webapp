import type { Metadata } from "next";
import { MailPlusIcon } from "lucide-react";

import { inviteStaffAction } from "@/app/(admin)/admin/staff/actions";
import { PageHeader } from "@/components/page-header";
import { InviteStaffDialog } from "@/components/staff/invite-staff-dialog";
import { StaffList } from "@/components/staff/staff-list";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getMockStaffWorkload } from "@/lib/mock/selectors";

export const metadata: Metadata = { title: "Staff" };

/**
 * The staff roster (PRD §4.1 — the Admin hires, monitors and removes staff).
 *
 * ── Inviting is real; the roster below it is not, yet ────────────────────────
 * `inviteStaffAction` creates an actual Supabase account, so it works today.
 * `getMockStaffWorkload` still returns fixtures, so a freshly invited person
 * will NOT appear in the list until the data layer lands — the list is not
 * reading the `profiles` table yet. That gap is why the alert below stays.
 */
export default async function AdminStaffPage() {
  const rows = await getMockStaffWorkload();

  return (
    <>
      <PageHeader
        title="Staff"
        description="Everyone with an account, and how much of the pipeline each is carrying."
        actions={<InviteStaffDialog action={inviteStaffAction} />}
      />

      <div className="flex flex-col gap-5">
        <Alert>
          <MailPlusIcon />
          <AlertTitle>The roster below is still sample data</AlertTitle>
          <AlertDescription>
            Invites create real accounts, but this list reads fixtures rather
            than the profiles table, so someone you invite will not show up here
            yet. Two things to check first: custom SMTP must be configured — the
            default mailer is capped near two emails an hour, which is not
            enough to onboard a team — and public sign-up must be turned off in
            the Supabase dashboard, since accounts are meant to exist by invite
            only.
          </AlertDescription>
        </Alert>

        <StaffList rows={rows} />
      </div>
    </>
  );
}
