"use client";

/**
 * Search, filter, sort and view-switch over a list of students.
 *
 * ── What this component is, and what it is not ───────────────────────────────
 * It receives the FULL list it is allowed to show as a typed prop and narrows
 * it in memory. It fetches nothing. That matters: the set it filters is already
 * the set the caller was permitted to read, so a filter here can only ever hide
 * rows the viewer could already see. Filtering is not scoping — Row Level
 * Security decides what arrives (PRD §7).
 *
 * Client-side because filtering has to feel instant at this scale. Once the
 * list outgrows a single page, this becomes server-side filtering with URL
 * state; the presentational components below it would not change.
 */

import { useMemo, useState } from "react";
import { LayoutGridIcon, ListIcon, SearchIcon, XIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/empty-state";
import { StudentCard } from "@/components/students/student-card";
import { StudentsTable } from "@/components/students/students-table";
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABELS,
  DECISION_STATUSES,
  DECISION_STATUS_LABELS,
  type ApplicationStatus,
  type DecisionStatus,
  type Staff,
  type StudentWithApplications,
} from "@/types/db";

const ALL = "all";
const UNASSIGNED = "unassigned";

const SORTS = {
  recent: "Newest file first",
  oldest: "Oldest file first",
  name: "Name (A–Z)",
  applications: "Most applications",
} as const;
type SortKey = keyof typeof SORTS;

/** A labelled select. `items` is what makes the trigger show the label. */
function FilterSelect({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  const items = Object.fromEntries(
    options.map((option) => [option.value, option.label]),
  );

  return (
    <Select
      items={items}
      value={value}
      onValueChange={(next) => onChange(String(next))}
    >
      <SelectTrigger size="sm" className={cn("min-w-0", className)} aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * ── Why a base path, not a `buildHref` function ──────────────────────────────
 * The route trees differ per role, so this component has to be told where a
 * student link points. It takes the base path as a STRING rather than a
 * function because a function cannot be passed from a Server Component to a
 * Client Component — React has no way to serialize it. Server-rendered
 * components in this codebase still take `buildHref` callbacks; only the
 * client boundary needs the string.
 */
export function StudentsExplorer({
  students,
  staff = [],
  showAssignedStaff = false,
  studentBasePath,
  initialAssignment = ALL,
  createHref,
  emptyTitle = "No students yet",
  emptyDescription,
}: {
  students: StudentWithApplications[];
  /** Only used to build the "assigned to" filter — Admin passes it, staff does not. */
  staff?: Staff[];
  showAssignedStaff?: boolean;
  /** Where a student link points, e.g. "/admin/students". See the note above. */
  studentBasePath: string;
  /** Lets a dashboard link land here with a filter already applied. */
  initialAssignment?: string;
  createHref?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const buildStudentHref = (studentId: string) => `${studentBasePath}/${studentId}`;

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>(ALL);
  const [decision, setDecision] = useState<string>(ALL);
  const [assignment, setAssignment] = useState<string>(initialAssignment);
  const [sort, setSort] = useState<SortKey>("recent");
  const [view, setView] = useState<"table" | "cards">("table");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();

    const matches = students.filter((student) => {
      if (needle) {
        const haystack = [
          student.full_name,
          student.assigned_staff?.full_name ?? "",
          ...student.applications.map((a) => a.university_name),
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(needle)) return false;
      }

      if (
        status !== ALL &&
        !student.applications.some(
          (a) => a.application_status === (status as ApplicationStatus),
        )
      ) {
        return false;
      }

      if (
        decision !== ALL &&
        !student.applications.some(
          (a) => a.decision_status === (decision as DecisionStatus),
        )
      ) {
        return false;
      }

      if (assignment === UNASSIGNED && student.assigned_staff_id !== null) {
        return false;
      }
      if (
        assignment !== ALL &&
        assignment !== UNASSIGNED &&
        student.assigned_staff_id !== assignment
      ) {
        return false;
      }

      return true;
    });

    const sorted = [...matches];
    switch (sort) {
      case "oldest":
        sorted.sort((a, b) => a.file_opened_at.localeCompare(b.file_opened_at));
        break;
      case "name":
        sorted.sort((a, b) => a.full_name.localeCompare(b.full_name));
        break;
      case "applications":
        sorted.sort((a, b) => b.applications.length - a.applications.length);
        break;
      default:
        sorted.sort((a, b) => b.file_opened_at.localeCompare(a.file_opened_at));
    }
    return sorted;
  }, [students, query, status, decision, assignment, sort]);

  const filtersActive =
    query.trim() !== "" ||
    status !== ALL ||
    decision !== ALL ||
    assignment !== ALL;

  function clearFilters() {
    setQuery("");
    setStatus(ALL);
    setDecision(ALL);
    setAssignment(ALL);
  }

  // "Nothing exists" and "nothing matches" are different problems and get
  // different wording — a filtered-to-empty list that says "No students yet"
  // reads as data loss.
  if (students.length === 0) {
    return (
      <EmptyState
        icon={SearchIcon}
        title={emptyTitle}
        description={emptyDescription}
        actionHref={createHref}
        actionLabel={createHref ? "Open a student file" : undefined}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search students or universities…"
              aria-label="Search students"
              className="h-8 pl-8"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute top-1/2 right-2 flex size-4 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <XIcon className="size-3.5" />
              </button>
            ) : null}
          </div>

          {/* View switch. Sits at the end of the row so the filters read as a
              group and the view control reads as separate from them. */}
          <div className="ml-auto flex items-center gap-1 rounded-lg border p-0.5">
            <Button
              variant={view === "table" ? "secondary" : "ghost"}
              size="icon-xs"
              onClick={() => setView("table")}
              aria-label="Table view"
              aria-pressed={view === "table"}
            >
              <ListIcon />
            </Button>
            <Button
              variant={view === "cards" ? "secondary" : "ghost"}
              size="icon-xs"
              onClick={() => setView("cards")}
              aria-label="Card view"
              aria-pressed={view === "cards"}
            >
              <LayoutGridIcon />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect
            label="Filter by application status"
            value={status}
            onChange={setStatus}
            options={[
              { value: ALL, label: "Any application status" },
              ...APPLICATION_STATUSES.map((value) => ({
                value,
                label: APPLICATION_STATUS_LABELS[value],
              })),
            ]}
          />

          <FilterSelect
            label="Filter by decision"
            value={decision}
            onChange={setDecision}
            options={[
              { value: ALL, label: "Any decision" },
              ...DECISION_STATUSES.map((value) => ({
                value,
                label: DECISION_STATUS_LABELS[value],
              })),
            ]}
          />

          {showAssignedStaff ? (
            <FilterSelect
              label="Filter by assigned staff"
              value={assignment}
              onChange={setAssignment}
              options={[
                { value: ALL, label: "Anyone assigned" },
                { value: UNASSIGNED, label: "Unassigned" },
                ...staff.map((member) => ({
                  value: member.id,
                  label: member.full_name,
                })),
              ]}
            />
          ) : null}

          <FilterSelect
            label="Sort"
            value={sort}
            onChange={(next) => setSort(next as SortKey)}
            options={Object.entries(SORTS).map(([value, label]) => ({
              value,
              label,
            }))}
          />

          {filtersActive ? (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <XIcon />
              Clear
            </Button>
          ) : null}

          <p
            aria-live="polite"
            className="ml-auto text-xs text-muted-foreground tabular-nums"
          >
            {filtered.length === students.length
              ? `${students.length} students`
              : `${filtered.length} of ${students.length} students`}
          </p>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={SearchIcon}
          title="No students match these filters"
          description="Try a different search term, or clear the filters to see everyone again."
        />
      ) : view === "table" ? (
        <StudentsTable
          students={filtered}
          showAssignedStaff={showAssignedStaff}
          buildHref={buildStudentHref}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((student) => (
            <StudentCard
              key={student.id}
              student={student}
              href={buildStudentHref(student.id)}
              showAssignedStaff={showAssignedStaff}
            />
          ))}
        </div>
      )}
    </div>
  );
}
