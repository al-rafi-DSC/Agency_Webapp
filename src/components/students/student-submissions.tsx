/**
 * Waiting responses from the student Google Form.
 *
 * Presentational. A response is not a student file: the Admin opens it, checks
 * the details, and opens the file with the workers they choose. Renders nothing
 * when empty, so the panel only appears when there is something to do.
 */

import Link from "next/link";
import { ClipboardListIcon } from "lucide-react";

import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/panel";
import type { StudentSubmission } from "@/types/workspace";

export function StudentSubmissions({
  submissions,
  buildHref = (submissionId: string) => `/admin/students/requests/${submissionId}`,
  className,
}: {
  submissions: StudentSubmission[];
  buildHref?: (submissionId: string) => string;
  className?: string;
}) {
  if (submissions.length === 0) return null;

  return (
    <Panel
      title={submissions.length === 1 ? "1 new student form" : `${submissions.length} new student forms`}
      description="Sent from the student form. Open one to read the answers, open the student file and assign workers."
      className={className}
    >
      <ul className="divide-y">
        {submissions.map((submission) => (
          <li
            key={submission.id}
            className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
          >
            <div className="flex min-w-0 items-start gap-3">
              <span
                aria-hidden
                className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-info-soft text-info-soft-foreground"
              >
                <ClipboardListIcon className="size-3.5" />
              </span>
              <div className="min-w-0 space-y-0.5">
                <Link
                  href={buildHref(submission.id)}
                  className="rounded text-sm font-medium break-words underline underline-offset-4 outline-none hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {submission.full_name || "Name not found in the form"}
                </Link>
                {submission.email || submission.phone ? (
                  <p className="text-sm break-all text-muted-foreground">
                    {[submission.email, submission.phone].filter(Boolean).join(" · ")}
                  </p>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  Sent {formatDate(submission.submitted_at)} · Not assigned yet
                </p>
              </div>
            </div>

            <Button
              size="sm"
              nativeButton={false}
              render={<Link href={buildHref(submission.id)}>Review and assign</Link>}
            />
          </li>
        ))}
      </ul>
    </Panel>
  );
}
