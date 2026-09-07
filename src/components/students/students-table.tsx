/**
 * Students table — the reference screen component.
 *
 * ★ THIS IS THE WORKED EXAMPLE. New screens should look like this one:
 *
 *   - Data arrives as typed props. No fetching, no Supabase import, no `async`.
 *   - `showAssignedStaff` toggles the Admin column set vs. the Staff one; the
 *     same component serves both roles. Hiding a column is presentation, NOT
 *     access control — a staff user simply never receives rows they cannot see,
 *     because Row Level Security filters them at the database (PRD §7).
 *   - Every list renders an explicit empty state.
 *   - Dates are formatted through `@/lib/format`, which pins an explicit locale
 *     and UTC, so server and client markup match and React does not throw a
 *     hydration error.
 *   - Statuses render through the badge components, which read their wording
 *     from `@/types/db` — no raw snake_case, no hard-coded status string.
 */

import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatDate, initials } from "@/lib/format";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  APPLICATION_STATUS_LABELS,
  type StudentWithApplications,
} from "@/types/db";
import { APPLICATION_MARK_CLASSES } from "@/components/status-colors";
import { DecisionStatusBadge } from "@/components/students/status-badge";

export interface StudentsTableProps {
  students: StudentWithApplications[];
  /** Admin sees who a student is assigned to; staff already know it's them. */
  showAssignedStaff?: boolean;
  /** Where a row links to — differs per role's route tree. */
  buildHref?: (studentId: string) => string;
  emptyMessage?: string;
}

/**
 * One chip per application, coloured by its status.
 *
 * A compact stand-in for the full list of university names, which becomes
 * unreadable past two or three. The `title` gives the university and the status
 * in words on hover, and the row still links through to the detail screen where
 * everything is spelled out — so nothing here is available ONLY by colour.
 */
function ApplicationChips({ student }: { student: StudentWithApplications }) {
  if (student.applications.length === 0) {
    return <span className="text-sm text-muted-foreground">None yet</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium tabular-nums">
        {student.applications.length}
      </span>
      <span className="flex gap-1" aria-hidden>
        {student.applications.map((application) => (
          <span
            key={application.id}
            title={`${application.university_name} — ${APPLICATION_STATUS_LABELS[application.application_status]}`}
            className={cn(
              "h-1.5 w-4 rounded-full",
              APPLICATION_MARK_CLASSES[application.application_status],
            )}
          />
        ))}
      </span>
    </div>
  );
}

export function StudentsTable({
  students,
  showAssignedStaff = false,
  buildHref = (studentId) => `/admin/students/${studentId}`,
  emptyMessage = "No students yet.",
}: StudentsTableProps) {
  if (students.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-10 text-center">
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Student</TableHead>
            <TableHead>File opened</TableHead>
            {showAssignedStaff ? <TableHead>Assigned to</TableHead> : null}
            <TableHead>Universities</TableHead>
            <TableHead>Latest decision</TableHead>
            <TableHead className="w-10" aria-label="Open" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.map((student) => {
            const latest = student.applications[0] ?? null;

            return (
              <TableRow key={student.id} className="group/row">
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2.5">
                    <Avatar size="sm">
                      {student.photo_url ? (
                        <AvatarImage src={student.photo_url} alt="" />
                      ) : null}
                      <AvatarFallback>
                        {initials(student.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <Link
                      href={buildHref(student.id)}
                      className="rounded underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      {student.full_name}
                    </Link>
                  </div>
                </TableCell>

                <TableCell className="text-muted-foreground whitespace-nowrap">
                  {formatDate(student.file_opened_at)}
                </TableCell>

                {showAssignedStaff ? (
                  <TableCell>
                    {student.assigned_staff ? (
                      <span className="flex items-center gap-2">
                        <Avatar size="sm" className="size-5">
                          <AvatarFallback className="text-[0.625rem]">
                            {initials(student.assigned_staff.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="whitespace-nowrap">
                          {student.assigned_staff.full_name}
                        </span>
                      </span>
                    ) : (
                      <span className="rounded-full bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning-soft-foreground">
                        Unassigned
                      </span>
                    )}
                  </TableCell>
                ) : null}

                <TableCell>
                  <ApplicationChips student={student} />
                </TableCell>

                <TableCell>
                  {latest ? (
                    <DecisionStatusBadge status={latest.decision_status} />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>

                <TableCell>
                  <Link
                    href={buildHref(student.id)}
                    aria-label={`Open ${student.full_name}`}
                    className="flex size-7 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <ChevronRightIcon className="size-4" />
                  </Link>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
