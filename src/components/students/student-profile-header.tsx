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
import { CalendarDaysIcon, FileTextIcon, UserIcon } from "lucide-react";

import { formatDateLong, initials, pluralize } from "@/lib/format";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { StudentWithApplications } from "@/types/db";

function Meta({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof UserIcon;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className="size-3" />
        {label}
      </p>
      <div className="text-sm">{children}</div>
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
  return (
    <div className="surface-panel flex flex-col gap-5 p-5">
      <div className="flex items-start gap-4">
        <Avatar size="lg" className="size-14">
          {student.photo_url ? (
            <AvatarImage src={student.photo_url} alt="" />
          ) : null}
          <AvatarFallback className="text-lg">
            {initials(student.full_name)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold tracking-tight">
            {student.full_name}
          </h1>
          <p className="text-sm text-muted-foreground">
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

      <dl className="grid gap-4 border-t pt-4 sm:grid-cols-3">
        <Meta icon={CalendarDaysIcon} label="File opened">
          {formatDateLong(student.file_opened_at)}
        </Meta>

        <Meta icon={UserIcon} label="Assigned to">
          {assignSlot ??
            (student.assigned_staff ? (
              student.assigned_staff.full_name
            ) : (
              <span className="text-muted-foreground">Unassigned</span>
            ))}
        </Meta>

        <Meta icon={FileTextIcon} label="Universities">
          {student.applications.length === 0 ? (
            <span className="text-muted-foreground">None yet</span>
          ) : (
            student.applications.length
          )}
        </Meta>
      </dl>
    </div>
  );
}
