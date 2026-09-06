/**
 * Domain types for Agency Workspace — mirrors PRD.md §5 (Data Model v1 sketch).
 *
 * These are hand-written for now. Once the Supabase schema exists they should be
 * replaced by (or checked against) `supabase gen types typescript`, so the
 * database stays the single source of truth.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠ PLACEHOLDER STATUS VALUES — PRD.md §10 lists the exact wording for
 * `application_status` and `scholarship_status` as an OPEN QUESTION. The unions
 * below are the PRD's illustrative set, not confirmed product vocabulary.
 * Do not write a database migration, a CHECK constraint, or a Postgres enum
 * against these values until the owner confirms them.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** ⚠ PLACEHOLDER — see file header. */
export const APPLICATION_STATUSES = [
  "not_started",
  "in_progress",
  "submitted",
  "under_review",
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

/** Confirmed in PRD §5.2 — Accepted / Rejected / Pending. */
export const DECISION_STATUSES = ["pending", "accepted", "rejected"] as const;
export type DecisionStatus = (typeof DECISION_STATUSES)[number];

/** ⚠ PLACEHOLDER — see file header. */
export const SCHOLARSHIP_STATUSES = [
  "not_applied",
  "applied",
  "awarded",
  "denied",
] as const;
export type ScholarshipStatus = (typeof SCHOLARSHIP_STATUSES)[number];

export const USER_ROLES = ["admin", "staff", "superadmin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** Human-readable labels. UI must render these, never the raw snake_case value. */
export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  submitted: "Submitted",
  under_review: "Under review",
};

export const DECISION_STATUS_LABELS: Record<DecisionStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  rejected: "Rejected",
};

export const SCHOLARSHIP_STATUS_LABELS: Record<ScholarshipStatus, string> = {
  not_applied: "Not applied",
  applied: "Applied",
  awarded: "Awarded",
  denied: "Denied",
};

/** PRD §5.3 — a staff member. Equal tier; no seniority among staff accounts. */
export interface Staff {
  id: string;
  /** Mirrors the Supabase Auth user id. */
  auth_user_id: string;
  full_name: string;
  email: string;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
}

/** PRD §5.2 — one row per university a student applies to. */
export interface UniversityApplication {
  id: string;
  student_id: string;
  /** Free text in v1 — no university lookup table (PRD §5.2). */
  university_name: string;
  application_link: string | null;
  application_status: ApplicationStatus;
  decision_status: DecisionStatus;
  /**
   * Enrollment fee paid + admission confirmed. Only actionable once
   * `decision_status === "accepted"`. Status tracking only — v1 does NOT
   * process real payments (PRD §3).
   */
  admission_confirmed: boolean;
  scholarship_status: ScholarshipStatus;
  created_at: string;
  updated_at: string;
}

/** PRD §5.1 — a student file. */
export interface Student {
  id: string;
  full_name: string;
  photo_url: string | null;
  /** Date the student's file was opened. Visible to Admin (PRD §5.1). */
  file_opened_at: string;
  /** Assigned manually by Admin in v1 — no auto-assignment (PRD §3). */
  assigned_staff_id: string | null;
  created_at: string;
}

/** A student joined with the data the list and detail screens actually render. */
export interface StudentWithApplications extends Student {
  assigned_staff: Pick<Staff, "id" | "full_name" | "avatar_url"> | null;
  applications: UniversityApplication[];
}
