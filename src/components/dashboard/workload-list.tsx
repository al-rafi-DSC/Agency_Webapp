/**
 * Staff caseloads as horizontal bars.
 *
 * One series, so no legend — the panel title names what the bars are. Each bar
 * is directly labelled with its student count, and the secondary line spells
 * out the application split, so the numbers never depend on reading a bar
 * length by eye.
 *
 * The bars are scaled against the BUSIEST staff member, not against an invented
 * capacity: the agency has not defined a maximum caseload, and putting a
 * "12 / 20" style meter on screen would be inventing product policy (PRD §10
 * leaves assignment rules open). Relative comparison is honest; a fake ceiling
 * is not.
 */

import Link from "next/link";

import { cn } from "@/lib/utils";
import { initials, pluralize } from "@/lib/format";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyState } from "@/components/empty-state";
import type { StaffWorkload } from "@/types/ui";

export function WorkloadList({
  rows,
  buildHref = (staffId: string) => `/admin/staff/${staffId}`,
}: {
  rows: StaffWorkload[];
  buildHref?: (staffId: string) => string;
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title="No staff accounts yet"
        description="Invite a staff member to start assigning students."
        className="border-0 py-6"
      />
    );
  }

  return (
    <ul className="flex flex-col gap-4">
      {rows.map((row) => (
        <li key={row.staff.id}>
          <Link
            href={buildHref(row.staff.id)}
            className="group/row flex items-center gap-3 rounded-lg p-1.5 -m-1.5 outline-none transition-colors hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Avatar size="sm">
              {row.staff.avatar_url ? (
                <AvatarImage src={row.staff.avatar_url} alt="" />
              ) : null}
              <AvatarFallback>{initials(row.staff.full_name)}</AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <p className="truncate text-sm font-medium group-hover/row:underline">
                  {row.staff.full_name}
                </p>
                <p className="shrink-0 text-sm font-medium tabular-nums">
                  {row.studentCount}
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    {row.studentCount === 1 ? "student" : "students"}
                  </span>
                </p>
              </div>

              <div
                className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted"
                role="img"
                aria-label={`${row.staff.full_name}: ${pluralize(row.studentCount, "student")}`}
              >
                <span
                  className={cn(
                    "block h-full rounded-full transition-[width] duration-300 ease-out",
                    row.studentCount === 0 ? "bg-transparent" : "bg-primary",
                  )}
                  style={{ width: `${Math.round(row.loadRatio * 100)}%` }}
                />
              </div>

              <p className="mt-1 truncate text-xs text-muted-foreground">
                {pluralize(row.applicationCount, "application")} ·{" "}
                {row.awaitingDecisionCount} awaiting decision ·{" "}
                {row.acceptedCount} accepted
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
