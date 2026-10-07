/**
 * A row of headline counts above a students list.
 *
 * Presentational: counts the list it is handed. That list is already what the
 * viewer may see (RLS decides that), so these numbers can never reveal a
 * student the viewer could not already open.
 */

import type { LucideIcon } from "lucide-react";
import {
  AlertTriangleIcon,
  FolderClosedIcon,
  UserPlusIcon,
  UsersIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { assignedWorkers, type StudentWithApplications } from "@/types/db";

function Chip({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="surface-panel flex items-center gap-3 px-4 py-3">
      <span
        aria-hidden
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md",
          tone,
        )}
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xl leading-none font-bold tabular-nums">{value}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export function StudentsSummary({
  students,
  showUnassigned = false,
}: {
  students: StudentWithApplications[];
  /** Admin only — staff are, by definition, assigned to every file they see. */
  showUnassigned?: boolean;
}) {
  const unassigned = students.filter(
    (s) => !assignedWorkers(s).some((w) => w.status !== "inactive"),
  ).length;
  const urgent = students.filter((s) => s.urgent_notes?.length).length;
  const closed = students.filter((s) => s.closed_at).length;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Chip
        icon={UsersIcon}
        label="Student files"
        value={students.length}
        tone="from-violet-500 to-fuchsia-500 shadow-violet-500/30"
      />
      {showUnassigned ? (
        <Chip
          icon={UserPlusIcon}
          label="Unassigned"
          value={unassigned}
          tone="from-amber-500 to-orange-400 shadow-amber-500/30"
        />
      ) : (
        <Chip
          icon={UserPlusIcon}
          label="Open files"
          value={students.length - closed}
          tone="from-sky-500 to-cyan-400 shadow-sky-500/30"
        />
      )}
      <Chip
        icon={AlertTriangleIcon}
        label="With urgent notes"
        value={urgent}
        tone="from-rose-500 to-red-500 shadow-rose-500/30"
      />
      <Chip
        icon={FolderClosedIcon}
        label="Closed files"
        value={closed}
        tone="from-slate-500 to-slate-600 shadow-slate-500/30"
      />
    </div>
  );
}
