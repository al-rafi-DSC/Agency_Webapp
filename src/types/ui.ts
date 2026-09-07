/**
 * Presentation-layer types — shapes the UI renders that are NOT the database
 * schema.
 *
 * WHY THIS FILE IS SEPARATE FROM `@/types/db`:
 *
 * `db.ts` mirrors PRD §5 and, once the Supabase schema exists, should be
 * replaced by generated types. Everything here is either a computed aggregate
 * (a dashboard statistic, a workload roll-up) or a fixture concept the PRD has
 * not committed to as a table. Keeping them apart means components can be typed
 * without importing from `@/lib/mock/**`, so Phase 3 swaps the data source with
 * no component edits, and nobody mistakes a dashboard tile for a schema
 * decision.
 *
 * ⚠ `ActivityEvent` and `StudentNote` are UI fixtures. The PRD does NOT define
 * an activity or notes table. Do not write a migration from these — raise the
 * question first.
 *
 * Naming: record-shaped types (things that would be a database row) use
 * `snake_case` fields to match the DB convention. Computed aggregates use
 * `camelCase`, because they are never persisted.
 */

import type {
  ApplicationStatus,
  DecisionStatus,
  ScholarshipStatus,
  Staff,
  UniversityApplication,
  UserRole,
} from "@/types/db";

/** The signed-in person, as the shell renders them. */
export interface SessionUser {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  avatar_url: string | null;
}

/** ⚠ UI fixture — no confirmed table behind this. See file header. */
export type ActivityKind =
  | "file_opened"
  | "student_assigned"
  | "application_added"
  | "application_status_changed"
  | "decision_received"
  | "scholarship_updated"
  | "admission_confirmed"
  | "note_added";

/** ⚠ UI fixture — no confirmed table behind this. See file header. */
export interface ActivityEvent {
  id: string;
  kind: ActivityKind;
  student_id: string;
  student_name: string;
  /** Null when the event has no actor in the fixtures (e.g. an unassigned file). */
  actor_name: string | null;
  university_name: string | null;
  summary: string;
  occurred_at: string;
}

/** ⚠ UI fixture — no confirmed table behind this. See file header. */
export interface StudentNote {
  id: string;
  student_id: string;
  author_name: string;
  body: string;
  created_at: string;
}

/**
 * One university application flattened with the student and staff it belongs
 * to — what the cross-student applications table renders per row.
 */
export interface ApplicationRow extends UniversityApplication {
  student: { id: string; full_name: string };
  assigned_staff: Pick<Staff, "id" | "full_name"> | null;
}

/** A staff member with their caseload rolled up. */
export interface StaffWorkload {
  staff: Staff;
  studentCount: number;
  applicationCount: number;
  acceptedCount: number;
  awaitingDecisionCount: number;
  /** Share of the largest caseload, 0–1 — drives the workload meter width. */
  loadRatio: number;
}

/** Counts keyed by status value, for the distribution visuals. */
export interface StatusBreakdown {
  application: Record<ApplicationStatus, number>;
  decision: Record<DecisionStatus, number>;
  scholarship: Record<ScholarshipStatus, number>;
}

/** Everything the dashboard tiles and charts need, computed once. */
export interface DashboardStats {
  totalStudents: number;
  unassignedStudents: number;
  studentsWithoutApplications: number;
  totalApplications: number;
  activeApplications: number;
  acceptedCount: number;
  rejectedCount: number;
  admissionsConfirmed: number;
  scholarshipsAwarded: number;
  breakdown: StatusBreakdown;
}

/**
 * A row in the "needs attention" queue.
 *
 * `reason` is why it surfaced; `severity` only orders the list visually. This
 * is a prompt for a human, not an automated action — nothing acts on it.
 */
export interface AttentionItem {
  id: string;
  severity: "high" | "medium";
  student_id: string;
  student_name: string;
  university_name: string | null;
  reason: string;
  detail: string;
}

/** One row in the topbar quick-find. Built per role from what that role can see. */
export interface SearchEntry {
  id: string;
  label: string;
  sublabel: string;
  href: string;
  group: string;
}
