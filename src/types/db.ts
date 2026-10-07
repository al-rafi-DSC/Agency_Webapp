/**
 * Domain types for Agency Workspace — mirrors PRD.md §5 (Data Model v1 sketch).
 *
 * Hand-written read models used by both the live data adapter and preview.
 * SQL schema: supabase/migrations/20260910130000_workspace_data.sql.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠ PLACEHOLDER STATUS VALUES — PRD.md §10 lists the exact wording for
 * `application_status` and `scholarship_status` wording as an OPEN QUESTION.
 * The constants below are the preview's illustrative set, not live vocabulary.
 * Real labels are configured by the Admin in workflow_statuses.
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
/** Live labels are supplied by the admin's workflow catalog. Constants above are preview fixtures only. */
export type ApplicationStatus = string;

/** PRD §5.2. Owner wording 2026-10-04: Pending / Approved / Rejected ("accepted" is shown as Approved). */
export const DECISION_STATUSES = ["pending", "accepted", "rejected"] as const;
export type DecisionStatus = (typeof DECISION_STATUSES)[number];

/** ⚠ PLACEHOLDER — see file header. */
export const SCHOLARSHIP_STATUSES = [
  "not_applied",
  "applied",
  "awarded",
  "denied",
] as const;
export type ScholarshipStatus = string;

/** Mirrors the CHECK on `students.applicant_type`. */
export const APPLICANT_TYPE_LABELS = { eu_equivalent: "EU Equivalent", international: "International" } as const;
export type ApplicantType = keyof typeof APPLICANT_TYPE_LABELS;
export function isApplicantType(value: string): value is ApplicantType { return Object.hasOwn(APPLICANT_TYPE_LABELS, value); }

/** Mirror the CHECKs in 20261007100000_staff_open_student_file.sql. Sex uses GENDER_LABELS (`@/types/workspace`). */
export const PROGRAM_LABELS = { bachelor: "Bachelor", master: "Master" } as const;
export const PRE_ENROLLMENT_STATUS_LABELS = { not_started: "Not started", submitted: "Submitted", approved: "Approved" } as const;
export const VISA_STATUS_LABELS = { approved: "Approved", rejected: "Rejected" } as const;
export const SPONSORSHIP_LABELS = { self: "Self", sponsor: "Sponsor" } as const;

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
  accepted: "Approved",
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
  status?: "active" | "inactive";
  phone?: string;
  /** "" until set. Labels in GENDER_LABELS (`@/types/workspace`). */
  gender?: string;
  address?: string;
  joined_on?: string | null;
  left_on?: string | null;
  /** Set when an Admin removed the worker. Nothing is deleted; see remove_worker migration. */
  removed_at?: string | null;
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
  /** Ticked independently of admission_confirmed. Status only, never a payment. */
  enrollment_fee_paid?: boolean;
  scholarship_status: ScholarshipStatus;
  preferred_subject?: string;
  entrance_exam?: string;
  entrance_exam_date?: string | null;
  scholarship_name?: string;
  scholarship_link?: string | null;
  created_at: string;
  updated_at: string;
  application_status_id?: string | null;
  scholarship_status_id?: string | null;
  is_submitted?: boolean;
  is_awarded?: boolean;
  /** Set when an admin archives the application. Hidden from staff and new reports. */
  archived_at?: string | null;
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
  file_number?: number;
  /** Editable name parts; `full_name` is derived from them by the database. */
  first_name?: string;
  surname?: string;
  email?: string;
  phone?: string;
  /** Null on files opened before the field existed. */
  applicant_type?: ApplicantType | null;
  /** HTTPS Google Drive link. Only an admin can set it (database trigger). */
  drive_link?: string | null;
  /** Null on files opened before the field existed. Keys of GENDER_LABELS. */
  gender?: string | null;
  agency_email?: string;
  /** 0–100. A recorded percentage, never a payment. */
  file_opening_charge_percent?: number | string | null;
  /** Passport or Carta d'Identità number — one field. */
  passport_number?: string;
  referral?: string;
  intake_session?: string;
  program?: keyof typeof PROGRAM_LABELS | null;
  pre_enrollment_status?: keyof typeof PRE_ENROLLMENT_STATUS_LABELS | null;
  /** The two visa outcome fields below are only set once this date is. */
  visa_appointment_date?: string | null;
  visa_file_submitted?: boolean | null;
  visa_status?: keyof typeof VISA_STATUS_LABELS | null;
  visa_country?: string;
  date_of_birth?: string | null;
  birth_place?: string;
  tax_code?: string;
  father_name?: string;
  mother_name?: string;
  permanent_address?: string;
  present_address?: string;
  /** A sponsor always has a name and relationship; "self" has neither. */
  sponsorship?: keyof typeof SPONSORSHIP_LABELS | null;
  sponsor_name?: string;
  sponsor_relationship?: string;
  /** The admin or staff member who opened the file. */
  created_by?: string;
  /** Set when an admin archives the file. Archived files are read-only. */
  archived_at?: string | null;
  /** Set when an admin or assigned worker closes the file. Closed files are read-only; only an admin reopens. */
  closed_at?: string | null;
  closed_by?: string | null;
  close_reason?: string | null;
}

/** A student joined with the data the list and detail screens actually render. */
export interface StudentWithApplications extends Student {
  assigned_staff: Pick<Staff, "id" | "full_name" | "avatar_url"> | null;
  /** Open applications only. Archived ones are in `archived_applications`. */
  applications: UniversityApplication[];
  /** Only ever populated for admins — RLS hides archived applications from staff. */
  archived_applications?: UniversityApplication[];
  /** Real assignments are many-to-many. Singular fields above only support old fixtures. */
  assigned_workers?: Pick<Staff, "id" | "full_name" | "avatar_url" | "status">[];
  /** Unresolved, unarchived Urgent notes, newest first — for dashboards and list labels. */
  urgent_notes?: { id: string; body: string; created_at: string }[];
}

export function assignedWorkers(student: Pick<StudentWithApplications, "assigned_workers" | "assigned_staff">): NonNullable<StudentWithApplications["assigned_workers"]> {
  return student.assigned_workers ?? (student.assigned_staff ? [student.assigned_staff] : []);
}

/** Preview values use the label maps; live catalog labels are already readable. */
export function statusLabel(value: string, labels: Record<string, string>) {
  return Object.hasOwn(labels, value) ? labels[value] : (value ? value.replaceAll("_", " ") : "Not set");
}
