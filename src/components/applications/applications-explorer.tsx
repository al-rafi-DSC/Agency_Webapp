"use client";
import { statusLabel } from "@/types/db";


/**
 * Every university application across every student, in one table (PRD §4.1).
 *
 * The student list answers "how is this person doing?". This answers "what is
 * sitting in the pipeline?" — which is a different question, so it is a
 * different screen rather than a tab on the first one.
 *
 * Client-side because the filtering is instant on a list this size. The FULL
 * list is passed in as props; in Phase 3 the rows come from a Supabase query
 * that already ran under RLS, so what arrives here is only ever what this
 * account is allowed to see. Filtering below is convenience, never a boundary.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRightIcon, FileTextIcon, SearchIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import {
  AdmissionBadge,
  ApplicationStatusBadge,
  DecisionStatusBadge,
  ScholarshipStatusBadge,
} from "@/components/students/status-badge";
import {
  APPLICATION_STATUS_LABELS,
  DECISION_STATUSES,
  DECISION_STATUS_LABELS,
  SCHOLARSHIP_STATUS_LABELS,
  type ApplicationStatus,
  type DecisionStatus,
  type ScholarshipStatus,
} from "@/types/db";
import type { ApplicationRow } from "@/types/ui";

const ALL = "all";

type SortKey = "updated" | "student" | "university";

const SORT_LABELS: Record<SortKey, string> = {
  updated: "Recently updated",
  student: "Student A–Z",
  university: "University A–Z",
};

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
      <SelectTrigger
        size="sm"
        className={cn("min-w-0", className)}
        aria-label={label}
      >
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

export function ApplicationsExplorer({
  rows,
  showAssignedStaff = false,
  studentBasePath,
}: {
  rows: ApplicationRow[];
  showAssignedStaff?: boolean;
  /** Where a student link points, e.g. "/admin/students". A string, not a
   *  callback: functions cannot cross the server -> client boundary. */
  studentBasePath: string;
}) {
  const buildStudentHref = (studentId: string) =>
    `${studentBasePath}/${studentId}`;

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>(ALL);
  const [decision, setDecision] = useState<string>(ALL);
  const [scholarship, setScholarship] = useState<string>(ALL);
  const [sort, setSort] = useState<SortKey>("updated");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();

    const matches = rows.filter((row) => {
      if (needle) {
        const haystack = [
          row.student.full_name,
          row.university_name,
          row.assigned_workers?.map((w) => w.full_name).join(" ") ?? row.assigned_staff?.full_name ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(needle)) return false;
      }

      if (status !== ALL && row.application_status !== (status as ApplicationStatus)) {
        return false;
      }
      if (decision !== ALL && row.decision_status !== (decision as DecisionStatus)) {
        return false;
      }
      if (
        scholarship !== ALL &&
        row.scholarship_status !== (scholarship as ScholarshipStatus)
      ) {
        return false;
      }

      return true;
    });

    return [...matches].sort((a, b) => {
      switch (sort) {
        case "student":
          return a.student.full_name.localeCompare(b.student.full_name);
        case "university":
          return a.university_name.localeCompare(b.university_name);
        default:
          return b.updated_at.localeCompare(a.updated_at);
      }
    });
  }, [rows, query, status, decision, scholarship, sort]);

  const isFiltered =
    query.trim().length > 0 ||
    status !== ALL ||
    decision !== ALL ||
    scholarship !== ALL;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search student, university or staff"
            aria-label="Search applications"
            className="h-9 pl-9"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <FilterSelect
            label="Filter by application status"
            value={status}
            onChange={setStatus}
            options={[
              { value: ALL, label: "Any status" },
              ...[...new Set(rows.map((r) => r.application_status))].map((value) => ({
                value,
                label: statusLabel(value, APPLICATION_STATUS_LABELS),
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
          <FilterSelect
            label="Filter by scholarship"
            value={scholarship}
            onChange={setScholarship}
            options={[
              { value: ALL, label: "Any scholarship" },
              ...[...new Set(rows.map((r) => r.scholarship_status))].map((value) => ({
                value,
                label: statusLabel(value, SCHOLARSHIP_STATUS_LABELS),
              })),
            ]}
          />
          <FilterSelect
            label="Sort applications"
            value={sort}
            onChange={(next) => setSort(next as SortKey)}
            options={(Object.keys(SORT_LABELS) as SortKey[]).map((value) => ({
              value,
              label: SORT_LABELS[value],
            }))}
          />
        </div>
      </div>

      <p className="text-sm text-muted-foreground" aria-live="polite">
        {filtered.length === rows.length
          ? `${rows.length} applications`
          : `${filtered.length} of ${rows.length} applications`}
      </p>

      {filtered.length === 0 ? (
        <EmptyState
          icon={FileTextIcon}
          title={
            isFiltered
              ? "No applications match these filters"
              : "No applications yet"
          }
          description={
            isFiltered
              ? "Try clearing a filter or searching for something else."
              : "Applications appear here as they are added to student files."
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Student</TableHead>
                <TableHead>University</TableHead>
                {showAssignedStaff ? <TableHead>Assigned to</TableHead> : null}
                <TableHead>Application</TableHead>
                <TableHead>Decision</TableHead>
                <TableHead>Scholarship</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="w-10" aria-label="Open" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row) => (
                <TableRow key={row.id} className="group/row">
                  <TableCell className="font-medium">
                    <Link
                      href={buildStudentHref(row.student.id)}
                      className="rounded underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      {row.student.full_name}
                    </Link>
                  </TableCell>

                  <TableCell>
                    <span className="block max-w-56 truncate">
                      {row.university_name}
                    </span>
                  </TableCell>

                  {showAssignedStaff ? (
                    <TableCell className="whitespace-nowrap">
                      {row.assigned_staff ? (
                        row.assigned_workers?.map((w) => w.full_name).join(", ") ?? row.assigned_staff.full_name
                      ) : (
                        <span className="text-muted-foreground">
                          Unassigned
                        </span>
                      )}
                    </TableCell>
                  ) : null}

                  <TableCell>
                    <ApplicationStatusBadge status={row.application_status} />
                  </TableCell>

                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <DecisionStatusBadge status={row.decision_status} />
                      {row.decision_status === "accepted" ? (
                        <AdmissionBadge confirmed={row.admission_confirmed} />
                      ) : null}
                    </div>
                  </TableCell>

                  <TableCell>
                    <ScholarshipStatusBadge status={row.scholarship_status} />
                  </TableCell>

                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDate(row.updated_at)}
                  </TableCell>

                  <TableCell>
                    <Link
                      href={buildStudentHref(row.student.id)}
                      aria-label={`Open ${row.student.full_name}`}
                      className="inline-flex rounded text-muted-foreground outline-none transition-transform group-hover/row:translate-x-0.5 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      <ChevronRightIcon className="size-4" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
