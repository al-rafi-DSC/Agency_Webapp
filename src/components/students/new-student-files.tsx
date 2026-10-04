/**
 * Dashboard notification: student files opened since this admin last marked
 * them as seen.
 *
 * Presentational. The "mark as seen" control is supplied by the page. Renders
 * nothing when empty, so the panel only appears when there is something new.
 */

import Link from "next/link";
import type { ReactNode } from "react";
import { BellIcon } from "lucide-react";

import { formatDate } from "@/lib/format";
import { Panel } from "@/components/panel";
import { APPLICANT_TYPE_LABELS, assignedWorkers } from "@/types/db";
import type { NewStudentFile } from "@/types/workspace";

export function NewStudentFiles({
  files,
  action,
  buildHref = (studentId: string) => `/admin/students/${studentId}`,
}: {
  files: NewStudentFile[];
  /** The "mark as seen" control. */
  action: ReactNode;
  buildHref?: (studentId: string) => string;
}) {
  if (files.length === 0) return null;

  return (
    <Panel
      title={files.length === 1 ? "1 new student file" : `${files.length} new student files`}
      description="Opened since you last checked."
      action={action}
    >
      <ul className="divide-y">
        {files.map(({ student, opened_by }) => {
          const workers = assignedWorkers(student);
          return (
            <li key={student.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
              <span
                aria-hidden
                className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
              >
                <BellIcon className="size-3.5" />
              </span>
              <div className="min-w-0 space-y-0.5">
                <Link
                  href={buildHref(student.id)}
                  className="rounded text-sm font-medium break-words underline underline-offset-4 outline-none hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {student.full_name}
                </Link>
                <p className="text-sm break-all text-muted-foreground">
                  {[
                    student.applicant_type ? APPLICANT_TYPE_LABELS[student.applicant_type] : null,
                    student.email || null,
                    student.phone || null,
                  ].filter(Boolean).join(" · ") || "No contact details"}
                </p>
                <p className="text-xs text-muted-foreground">
                  File opened {formatDate(student.file_opened_at)}
                  {opened_by ? ` by ${opened_by}` : ""}
                  {" · "}
                  {workers.length ? `Assigned to ${workers.map((w) => w.full_name).join(", ")}` : "Unassigned"}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
