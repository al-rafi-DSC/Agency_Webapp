/**
 * One university application (PRD §5.2). A student has several of these in
 * parallel, each with independent statuses.
 *
 * ── The one product rule encoded here ────────────────────────────────────────
 * `admission_confirmed` "becomes actionable only after decision_status =
 * Accepted" (PRD §5.2). So the confirmation row only shows a state once an
 * offer exists; before that it says what has to happen first, rather than
 * showing a "Not confirmed" badge that would imply somebody forgot to do
 * something they cannot do yet.
 *
 * And it is a STATUS, not a payment. v1 tracks whether the enrollment fee has
 * been paid; it does not take one (PRD §3). There is deliberately no amount, no
 * currency, and no pay button anywhere in this component.
 */

import { ExternalLinkIcon, LinkIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import {
  AdmissionBadge,
  ApplicationStatusBadge,
  DecisionStatusBadge,
  ScholarshipStatusBadge,
} from "@/components/students/status-badge";
import type { UniversityApplication } from "@/types/db";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export function ApplicationCard({
  application,
  className,
}: {
  application: UniversityApplication;
  className?: string;
}) {
  const accepted = application.decision_status === "accepted";

  return (
    <article className={cn("surface-panel flex flex-col", className)}>
      <header className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3">
        <div className="min-w-0 space-y-1">
          <h3 className="truncate font-medium">{application.university_name}</h3>
          {application.application_link ? (
            <a
              href={application.application_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex max-w-full items-center gap-1.5 rounded text-xs text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <LinkIcon className="size-3 shrink-0" />
              <span className="truncate">{application.application_link}</span>
              <ExternalLinkIcon className="size-3 shrink-0" />
            </a>
          ) : (
            <p className="text-xs text-muted-foreground">
              No application link saved
            </p>
          )}
        </div>

        <ApplicationStatusBadge status={application.application_status} />
      </header>

      <dl className="grid gap-4 p-4 sm:grid-cols-3">
        <Field label="Decision">
          <DecisionStatusBadge status={application.decision_status} />
        </Field>

        <Field label="Scholarship">
          <ScholarshipStatusBadge status={application.scholarship_status} />
        </Field>

        <Field label="Admission">
          {accepted ? (
            <AdmissionBadge confirmed={application.admission_confirmed} />
          ) : (
            <span className="text-xs text-muted-foreground">
              Available once an offer is received
            </span>
          )}
        </Field>
      </dl>

      <footer className="mt-auto flex flex-wrap gap-x-4 gap-y-1 border-t px-4 py-2.5 text-xs text-muted-foreground">
        <span>Added {formatDate(application.created_at)}</span>
        <span>Updated {formatDate(application.updated_at)}</span>
      </footer>
    </article>
  );
}
