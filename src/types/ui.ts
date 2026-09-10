/**
 * Presentation-layer types — shapes the UI renders that are NOT the database
 * schema.
 *
 * WHY THIS FILE IS SEPARATE FROM `@/types/db`:
 *
 * These shapes describe computed dashboard aggregates and joined display data.
 * Live activity adapts application_history, and notes adapt student_notes.
 * Preview fixtures implement the same interfaces without database access.
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

/** Activity categories supported by the presentation layer. */
export type ActivityKind =
  | "file_opened"
  | "student_assigned"
  | "application_added"
  | "application_status_changed"
  | "decision_received"
  | "scholarship_updated"
  | "admission_confirmed"
  | "note_added";

/** Joined activity display record. */
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

/** Note with the author name that the caller may see. */
export interface StudentNote {
  id: string;
  student_id: string;
  author_name: string;
  body: string;
  created_at: string;
  archived_at?: string | null;
}

/**
 * One university application flattened with the student and staff it belongs
 * to — what the cross-student applications table renders per row.
 */
export interface ApplicationRow extends UniversityApplication {
  student: { id: string; full_name: string };
  assigned_staff: Pick<Staff, "id" | "full_name"> | null;
  assigned_workers?: Pick<Staff, "id" | "full_name" | "avatar_url" | "status">[];
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
