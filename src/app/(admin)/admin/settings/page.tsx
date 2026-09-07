import type { Metadata } from "next";
import { CircleHelpIcon, ShieldCheckIcon } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";
import { getMockSessionUser } from "@/lib/mock/students";
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABELS,
  SCHOLARSHIP_STATUSES,
  SCHOLARSHIP_STATUS_LABELS,
} from "@/types/db";

export const metadata: Metadata = { title: "Settings" };

/**
 * Workspace settings.
 *
 * Deliberately thin. The things that look like settings here — status
 * vocabulary, assignment rules — are OPEN QUESTIONS in PRD §10, and turning an
 * open question into an editable field would be answering it. So this screen
 * shows what the workspace currently assumes and names what has not been
 * decided, rather than offering switches nobody has agreed on.
 *
 * The one genuinely working control is the theme, because appearance is a local
 * preference with no product decision behind it.
 */

/** PRD §10 — surfaced, not answered. */
const OPEN_QUESTIONS = [
  {
    title: "Student-to-staff assignment rules",
    detail:
      "Assignment is manual today. Whether it should follow a rule — round robin, by country, by workload — has not been decided, so nothing here suggests or automates a match.",
  },
  {
    title: "Payment scope",
    detail:
      "Admission confirmation is tracked as a status only. Whether the workspace should ever take a real payment is undecided; there is no amount, currency or payment control anywhere in this build.",
  },
  {
    title: "Status vocabulary",
    detail:
      "The application and scholarship values below are the PRD's illustrative set, not confirmed wording. They are read from one file, so a confirmed list is a one-file change.",
  },
] as const;

export default async function AdminSettingsPage() {
  const user = await getMockSessionUser("admin");

  return (
    <>
      <PageHeader
        title="Settings"
        description="What this workspace currently assumes, and what has not been decided yet."
      />

      <div className="flex flex-col gap-5">
        <Panel title="Account" description="The signed-in account.">
          <dl className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <dt className="text-xs font-medium text-muted-foreground">Name</dt>
              <dd className="text-sm">{user.full_name}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium text-muted-foreground">
                Email
              </dt>
              <dd className="truncate text-sm">{user.email}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium text-muted-foreground">Role</dt>
              <dd>
                <Badge variant="secondary" className="capitalize">
                  {user.role}
                </Badge>
              </dd>
            </div>
          </dl>
        </Panel>

        <Panel
          title="Appearance"
          description="Stored in this browser only — it is not part of the account."
        >
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Follow the system setting, or pin light or dark.
            </p>
            <ThemeToggle />
          </div>
        </Panel>

        <Panel
          title="Access"
          description="How visibility is decided in this product."
        >
          <Alert>
            <ShieldCheckIcon />
            <AlertTitle>Access is enforced in the database</AlertTitle>
            <AlertDescription>
              An Admin sees every student; a staff member sees only their
              assigned students. That rule lives in Supabase Row Level Security
              policies, not in this interface. Hiding a screen or a column is
              presentation — the database is what actually refuses. Accounts are
              created by Admin invite only; there is no public sign-up.
            </AlertDescription>
          </Alert>
        </Panel>

        <Panel
          title="Status vocabulary"
          description="What the pipeline currently calls each stage."
        >
          <div className="flex flex-col gap-4">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Application status
              </p>
              <div className="flex flex-wrap gap-1.5">
                {APPLICATION_STATUSES.map((status) => (
                  <Badge key={status} variant="outline">
                    {APPLICATION_STATUS_LABELS[status]}
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Scholarship status
              </p>
              <div className="flex flex-wrap gap-1.5">
                {SCHOLARSHIP_STATUSES.map((status) => (
                  <Badge key={status} variant="outline">
                    {SCHOLARSHIP_STATUS_LABELS[status]}
                  </Badge>
                ))}
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Decision is fixed at Pending, Accepted and Rejected. The two lists
              above are placeholders awaiting confirmation — they are not
              editable here, because changing them changes stored data.
            </p>
          </div>
        </Panel>

        <Panel
          title="Open questions"
          description="Raised rather than assumed. Each one needs an answer from the owner."
        >
          <ul className="flex flex-col gap-4">
            {OPEN_QUESTIONS.map((question) => (
              <li key={question.title} className="flex gap-3">
                <CircleHelpIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">{question.title}</p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {question.detail}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
