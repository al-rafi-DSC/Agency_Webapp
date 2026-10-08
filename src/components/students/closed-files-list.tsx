"use client";

/**
 * The Closed files page: every closed student file the viewer can read, with
 * search and filters.
 *
 * Presentational. The list arrives already scoped by RLS, so staff only ever
 * see their own closed files, and the filters narrow it in memory — they can
 * only hide rows the viewer could already see. Opening a row goes to the
 * read-only student page, where an admin can reopen it.
 */

import Link from "next/link";
import { useMemo, useState } from "react";
import { FolderClosedIcon, SearchIcon, XIcon } from "lucide-react";

import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/empty-state";
import { Panel } from "@/components/panel";
import { FilterSelect } from "@/components/students/students-explorer";
import { APPLICANT_TYPE_LABELS, assignedWorkers, type StudentWithApplications } from "@/types/db";
import type { ClosedStudentFile } from "@/types/workspace";

const ALL = "all";
const UNASSIGNED = "unassigned";

const OUTCOMES = {
  confirmed: "Admission confirmed",
  offer: "Offer, not confirmed",
  none: "No offer",
} as const;
type Outcome = keyof typeof OUTCOMES;

/** One outcome per file: the furthest any of its applications got. */
function outcomeOf(student: StudentWithApplications): Outcome {
  if (student.applications.some((a) => a.admission_confirmed)) return "confirmed";
  if (student.applications.some((a) => a.decision_status === "accepted")) return "offer";
  return "none";
}

/** Dates are shown in UTC (see lib/format), so the year is read the same way. */
const yearOf = (value: string) => value.slice(0, 4);

function yearOptions(values: string[], anyLabel: string) {
  return [
    { value: ALL, label: anyLabel },
    ...[...new Set(values.map(yearOf))].sort().reverse().map((year) => ({ value: year, label: year })),
  ];
}

export function ClosedFilesList({
  files,
  studentBasePath,
  emptyDescription,
  showWorkerFilter = false,
}: {
  files: ClosedStudentFile[];
  /** Where a student link points, e.g. "/admin/students". A string, not a function: this is a client component. */
  studentBasePath: string;
  emptyDescription: string;
  /** Admin only — a worker's list holds only their own files. */
  showWorkerFilter?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [closedYear, setClosedYear] = useState<string>(ALL);
  const [openedYear, setOpenedYear] = useState<string>(ALL);
  const [worker, setWorker] = useState<string>(ALL);
  const [applicantType, setApplicantType] = useState<string>(ALL);
  const [outcome, setOutcome] = useState<string>(ALL);

  // Workers come from the files themselves, so a removed worker's closed files can still be found.
  const workerOptions = useMemo(() => {
    const byId = new Map<string, string>();
    for (const { student } of files) for (const w of assignedWorkers(student)) byId.set(w.id, w.full_name);
    return [...byId].sort((a, b) => a[1].localeCompare(b[1])).map(([value, label]) => ({ value, label }));
  }, [files]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return files.filter(({ student }) => {
      if (needle) {
        const haystack = [student.full_name, student.phone, student.email, student.close_reason]
          .filter(Boolean).join(" ").toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      if (closedYear !== ALL && yearOf(student.closed_at ?? "") !== closedYear) return false;
      if (openedYear !== ALL && yearOf(student.file_opened_at) !== openedYear) return false;
      const workers = assignedWorkers(student);
      if (worker === UNASSIGNED && workers.length) return false;
      if (worker !== ALL && worker !== UNASSIGNED && !workers.some((w) => w.id === worker)) return false;
      if (applicantType !== ALL && student.applicant_type !== applicantType) return false;
      if (outcome !== ALL && outcomeOf(student) !== outcome) return false;
      return true;
    });
  }, [files, query, closedYear, openedYear, worker, applicantType, outcome]);

  const filtersActive = query.trim() !== "" || closedYear !== ALL || openedYear !== ALL
    || worker !== ALL || applicantType !== ALL || outcome !== ALL;

  function clearFilters() {
    setQuery("");
    setClosedYear(ALL);
    setOpenedYear(ALL);
    setWorker(ALL);
    setApplicantType(ALL);
    setOutcome(ALL);
  }

  if (files.length === 0) {
    return <EmptyState icon={FolderClosedIcon} title="No closed files" description={emptyDescription} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="surface-panel flex flex-col gap-3 p-3 sm:p-4">
        <div className="relative min-w-0 sm:max-w-sm">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, phone, email or reason…"
            aria-label="Search closed files"
            className="h-10 rounded-full bg-background pl-9"
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

        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect
            label="Filter by year closed"
            value={closedYear}
            onChange={setClosedYear}
            options={yearOptions(files.map(({ student }) => student.closed_at ?? ""), "Closed in any year")}
          />
          <FilterSelect
            label="Filter by year opened"
            value={openedYear}
            onChange={setOpenedYear}
            options={yearOptions(files.map(({ student }) => student.file_opened_at), "Opened in any year")}
          />
          {showWorkerFilter ? (
            <FilterSelect
              label="Filter by worker"
              value={worker}
              onChange={setWorker}
              options={[{ value: ALL, label: "Any worker" }, { value: UNASSIGNED, label: "Unassigned" }, ...workerOptions]}
            />
          ) : null}
          <FilterSelect
            label="Filter by applicant from"
            value={applicantType}
            onChange={setApplicantType}
            options={[
              { value: ALL, label: "Any applicant type" },
              ...Object.entries(APPLICANT_TYPE_LABELS).map(([value, label]) => ({ value, label })),
            ]}
          />
          <FilterSelect
            label="Filter by outcome"
            value={outcome}
            onChange={setOutcome}
            options={[{ value: ALL, label: "Any outcome" }, ...Object.entries(OUTCOMES).map(([value, label]) => ({ value, label }))]}
          />
          {filtersActive ? (
            <Button variant="ghost" size="sm" className="rounded-full" onClick={clearFilters}>
              <XIcon />
              Clear filters
            </Button>
          ) : null}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={SearchIcon}
          title="No closed files match"
          description="Try a different search or clear the filters."
        />
      ) : (
        <Panel
          title={filtersActive
            ? `${filtered.length} of ${files.length} closed files`
            : files.length === 1 ? "1 closed file" : `${files.length} closed files`}
          description="Read-only. Most recently closed first."
        >
          <ul className="divide-y">
            {filtered.map(({ student, closed_by_name }) => {
              const workers = assignedWorkers(student);
              return (
                <li key={student.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <span
                    aria-hidden
                    className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
                  >
                    <FolderClosedIcon className="size-3.5" />
                  </span>
                  <div className="min-w-0 space-y-0.5">
                    <Link
                      href={`${studentBasePath}/${student.id}`}
                      className="rounded text-sm font-medium break-words underline underline-offset-4 outline-none hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      {student.full_name}
                    </Link>
                    <p className="text-sm break-words text-muted-foreground">
                      <span className="text-foreground/80">Reason:</span> {student.close_reason || "No reason recorded"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {[
                        `Closed ${formatDate(student.closed_at!)}${closed_by_name ? ` by ${closed_by_name}` : ""}`,
                        `Opened ${formatDate(student.file_opened_at)}`,
                        student.applicant_type ? APPLICANT_TYPE_LABELS[student.applicant_type] : null,
                        OUTCOMES[outcomeOf(student)],
                        workers.length ? `Assigned to ${workers.map((w) => w.full_name).join(", ")}` : "Unassigned",
                      ].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>
      )}
    </div>
  );
}
