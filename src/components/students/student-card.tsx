import { assignedWorkers } from "@/types/db";
import { statusLabel } from "@/types/db";
/**
 * Card view of a student file — the alternative to the table on the students
 * list, and the shape used wherever a student appears outside a table.
 *
 * Presentational: typed props in, markup out. Same rules as the table.
 */

import Link from "next/link";
import { CalendarDaysIcon, UserIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatDate, initials, pluralize } from "@/lib/format";
import { avatarTone } from "@/components/students/avatar-tone";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { APPLICATION_MARK_CLASSES } from "@/components/status-colors";
import { ClosedFileBadge, DecisionStatusBadge, NotePriorityBadge } from "@/components/students/status-badge";
import {
  APPLICATION_STATUS_LABELS,
  type StudentWithApplications,
} from "@/types/db";

export function StudentCard({
  student,
  href,
  showAssignedStaff = false,
}: {
  student: StudentWithApplications;
  href: string;
  showAssignedStaff?: boolean;
}) {
  const latest = student.applications[0] ?? null;

  return (
    <Link
      href={href}
      className="surface-panel stat-tile group/card flex flex-col gap-4 p-5 outline-none hover:border-primary/40 focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <div className="flex items-start gap-3">
        <Avatar size="lg">
          {student.photo_url ? (
            <AvatarImage src={student.photo_url} alt="" />
          ) : null}
          <AvatarFallback className={avatarTone(student.full_name)}>{initials(student.full_name)}</AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold group-hover/card:text-primary">
            {student.full_name}
            {student.closed_at ? <ClosedFileBadge className="ml-2 align-middle" /> : null}
            {student.urgent_notes?.length ? <NotePriorityBadge priority="urgent" className="ml-2 align-middle" /> : null}
          </p>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDaysIcon className="size-3" />
            Opened {formatDate(student.file_opened_at)}
          </p>
        </div>

        {latest ? <DecisionStatusBadge status={latest.decision_status} /> : null}
      </div>

      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">
          {student.applications.length === 0
            ? "No universities added yet"
            : pluralize(student.applications.length, "university", "universities")}
        </p>

        {student.applications.length > 0 ? (
          <div className="flex gap-1" aria-hidden>
            {student.applications.map((application) => (
              <span
                key={application.id}
                title={`${application.university_name} — ${statusLabel(application.application_status, APPLICATION_STATUS_LABELS)}`}
                className={cn(
                  "h-2 flex-1 rounded-full",
                  APPLICATION_MARK_CLASSES[application.application_status] ?? "bg-primary",
                )}
              />
            ))}
          </div>
        ) : null}

        {student.applications.length > 0 ? (
          <p className="truncate text-xs text-muted-foreground">
            {student.applications
              .map((application) => application.university_name)
              .join(" · ")}
          </p>
        ) : null}
      </div>

      {showAssignedStaff ? (
        <div className="mt-auto flex items-center gap-1.5 border-t pt-3 text-xs">
          <UserIcon className="size-3 text-muted-foreground" />
          {student.assigned_staff ? (
            <span className="truncate text-muted-foreground">
              {assignedWorkers(student).map((w) => w.full_name + (w.status === "inactive" ? " (inactive)" : "")).join(", ")}
            </span>
          ) : (
            <span className="font-medium text-warning-soft-foreground">
              Unassigned
            </span>
          )}
        </div>
      ) : null}
    </Link>
  );
}
