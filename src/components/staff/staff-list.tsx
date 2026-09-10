/**
 * The staff roster with each member's caseload rolled up (PRD §4.1).
 *
 * Presentational and server-rendered. Staff accounts are peers — PRD §5.3 is
 * explicit that there is no seniority among them — so this list ranks by
 * caseload only, and says so, rather than implying a hierarchy.
 */

import Link from "next/link";
import { ChevronRightIcon, UserCogIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { initials, pluralize } from "@/lib/format";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyState } from "@/components/empty-state";
import type { StaffWorkload } from "@/types/ui";

function Metric({ value, label }: { value: number; label: string }) {
  return (
    <div className="min-w-16">
      <p className="text-lg leading-none font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export function StaffList({
  rows,
  buildHref = (staffId: string) => `/admin/staff/${staffId}`,
}: {
  rows: StaffWorkload[];
  buildHref?: (staffId: string) => string;
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={UserCogIcon}
        title="No staff accounts yet"
        description="Staff are added by invite — there is no public sign-up."
      />
    );
  }

  return (
    <ul className="grid gap-3 xl:grid-cols-2">
      {rows.map((row) => (
        <li key={row.staff.id}>
          <Link
            href={buildHref(row.staff.id)}
            className="group/card surface-panel flex items-start gap-4 p-4 outline-none transition-colors hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Avatar size="lg">
              {row.staff.avatar_url ? (
                <AvatarImage src={row.staff.avatar_url} alt="" />
              ) : null}
              <AvatarFallback>{initials(row.staff.full_name)}</AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1 space-y-3">
              <div className="min-w-0">
                <p className="truncate font-medium group-hover/card:underline">
                  {row.staff.full_name}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  {row.staff.email}{row.staff.status === "inactive" ? " · Inactive" : ""}
                </p>
              </div>

              <div className="flex flex-wrap gap-x-6 gap-y-2">
                <Metric
                  value={row.studentCount}
                  label={row.studentCount === 1 ? "student" : "students"}
                />
                <Metric
                  value={row.applicationCount}
                  label={
                    row.applicationCount === 1 ? "application" : "applications"
                  }
                />
                <Metric value={row.awaitingDecisionCount} label="awaiting" />
                <Metric value={row.acceptedCount} label="accepted" />
              </div>

              <div
                className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
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
            </div>

            <ChevronRightIcon className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover/card:translate-x-0.5" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
