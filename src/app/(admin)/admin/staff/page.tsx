import type { Metadata } from "next";
import { MailPlusIcon, UserPlusIcon } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { StaffList } from "@/components/staff/staff-list";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { getMockStaffWorkload } from "@/lib/mock/selectors";

export const metadata: Metadata = { title: "Staff" };

/**
 * The staff roster (PRD §4.1 — the Admin hires, monitors and removes staff).
 *
 * The "Invite" button is intentionally inert. Creating an account goes through
 * the Supabase Auth admin API, which needs the service-role key and therefore
 * runs server-side in hand-written code (AGENTS.md, CLAUDE.md). There is no
 * public sign-up to fall back on — PRD §7 — so a button that appeared to work
 * would be inventing the one flow that most needs to be built carefully.
 */
export default async function AdminStaffPage() {
  const rows = await getMockStaffWorkload();

  return (
    <>
      <PageHeader
        title="Staff"
        description="Everyone with an account, and how much of the pipeline each is carrying."
        actions={
          <Button disabled>
            <UserPlusIcon />
            Invite staff
          </Button>
        }
      />

      <div className="flex flex-col gap-5">
        <Alert>
          <MailPlusIcon />
          <AlertTitle>Inviting is not wired up yet</AlertTitle>
          <AlertDescription>
            Accounts are created by invite only — there is no public sign-up.
            That runs through the Supabase Auth admin API with the service-role
            key, which stays server-side in hand-written code. Custom SMTP has
            to be configured first: the default mailer is capped near two emails
            an hour, which is not enough to onboard a team.
          </AlertDescription>
        </Alert>

        <StaffList rows={rows} />
      </div>
    </>
  );
}
