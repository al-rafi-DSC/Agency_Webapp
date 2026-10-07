import { APPLICANT_TYPE_LABELS, assignedWorkers } from "@/types/db";
/**
 * Identity block at the top of a student file.
 *
 * Presentational. The reassign control is passed in as `assignSlot` rather than
 * rendered here, so this component stays a Server Component and the one
 * interactive piece is the only thing that ships JavaScript. Staff screens pass
 * nothing and get a read-only line instead — which is presentation, not access
 * control: what a staff account may WRITE is a database policy (PRD §7).
 */

import type { ReactNode } from "react";
import {
  CalendarDaysIcon,
  ExternalLinkIcon,
  FileTextIcon,
  FolderIcon,
  GlobeIcon,
  UserIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { formatDateLong, initials, pluralize } from "@/lib/format";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { avatarTone } from "@/components/students/avatar-tone";
import { ClosedFileBadge, NotePriorityBadge } from "@/components/students/status-badge";
import type { StudentWithApplications } from "@/types/db";

function Meta({
  icon: Icon,
  label,
  children,
  className,
}: {
  icon: typeof UserIcon;
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex gap-3 rounded-xl border bg-muted/40 p-3.5", className)}>
      <span
        aria-hidden
        className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-foreground"
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1 space-y-0.5">
        <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
        <dd className="text-sm font-medium break-words">{children}</dd>
      </div>
    </div>
  );
}

export function StudentProfileHeader({
  student,
  assignSlot,
}: {
  student: StudentWithApplications;
  /** Admin passes the reassign control; staff passes nothing. */
  assignSlot?: ReactNode;
}) {
  const fileNumber = student.file_number
    ? `ST-${String(student.file_number).padStart(6, "0")}`
    : null;

  return (
    <div className="surface-panel overflow-hidden">
      {/* Cover — the same violet scene as the dashboard banner. */}
      <div aria-hidden className="hero-banner h-24 rounded-none shadow-none sm:h-28" />

      <div className="px-5 pb-5 sm:px-6 sm:pb-6">
        <div className="flex flex-wrap items-end gap-4">
          <Avatar className="-mt-10 size-20 shadow-xl ring-4 ring-card">
            {student.photo_url ? (
              <AvatarImage src={student.photo_url} alt="" />
            ) : null}
            <AvatarFallback className={cn("text-2xl", avatarTone(student.full_name))}>
              {initials(student.full_name)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1 pt-3">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight break-words">
                {student.full_name}
              </h1>
              {fileNumber ? (
                <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary-soft-foreground tabular-nums">
                  {fileNumber}
                </span>
              ) : null}
              {student.closed_at ? <ClosedFileBadge /> : null}
              {student.urgent_notes?.length ? <NotePriorityBadge priority="urgent" /> : null}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {student.applications.length === 0
                ? "No universities added yet"
                : pluralize(
                    student.applications.length,
                    "university application",
                    "university applications",
                  )}
            </p>
          </div>

        </div>

        <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Meta icon={CalendarDaysIcon} label="File opened">
            {formatDateLong(student.file_opened_at)}
          </Meta>

          <Meta icon={GlobeIcon} label="Applicant from">
            {student.applicant_type ? APPLICANT_TYPE_LABELS[student.applicant_type] : <span className="text-muted-foreground">Not set</span>}
          </Meta>

          <Meta icon={FileTextIcon} label="Universities">
            {student.applications.length === 0 ? (
              <span className="text-muted-foreground">None yet</span>
            ) : (
              student.applications.length
            )}
          </Meta>

          <Meta icon={FolderIcon} label="Drive">
            {student.drive_link ? (
              <a href={student.drive_link} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50">
                Open Drive folder <ExternalLinkIcon className="size-3" />
              </a>
            ) : <span className="text-muted-foreground">No link yet</span>}
          </Meta>

          <Meta icon={UserIcon} label="Assigned to" className="sm:col-span-2 lg:col-span-4">
            {assignSlot ??
              (student.assigned_staff ? (
                assignedWorkers(student).map((w) => w.full_name + (w.status === "inactive" ? " (inactive)" : "")).join(", ")
              ) : (
                <span className="text-muted-foreground">Unassigned</span>
              ))}
          </Meta>
        </dl>
      </div>
    </div>
  );
}
