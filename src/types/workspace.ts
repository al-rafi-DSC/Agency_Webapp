export interface ActionState {
  error: string | null;
  message?: string | null;
}
export type FormAction = (state: ActionState, data: FormData) => Promise<ActionState>;

export interface WorkflowStatus {
  id: string;
  category: "application" | "scholarship";
  label: string;
  counts_as_submitted: boolean;
  counts_as_awarded: boolean;
  archived: boolean;
}

/** Mirrors the gender CHECK on `worker_details` and `staff_registrations`. */
export const GENDER_LABELS = { male: "Male", female: "Female", other: "Other" } as const;
export type Gender = keyof typeof GENDER_LABELS;
export function isGender(value: string): value is Gender { return value in GENDER_LABELS; }

/** A waiting request from the staff details form. It is not an account. */
export interface StaffRegistration {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  gender: Gender;
  address: string;
  submitted_at: string;
  /** A staff account with this email already exists, so the Admin can apply the details to it. */
  has_account: boolean;
}

/** A waiting response from the student Google Form. It is not a student file. */
export interface StudentSubmission {
  id: string;
  /** Best guesses picked out of the answers; the Admin confirms them. "" when not found. */
  full_name: string;
  email: string;
  phone: string;
  /** Every question and answer, in form order. */
  answers: { question: string; answer: string }[];
  submitted_at: string;
}

export interface StudentDocument {
  id: string;
  name: string;
  size_bytes: number;
  mime_type: string;
  created_at: string;
  download_url: string | null;
  archived_at?: string | null;
}

export interface ReportPayload {
  new_students: number;
  students_handled: number;
  applications_submitted: number;
  offers_received: number;
  rejections_received: number;
  admissions_confirmed: number;
  scholarships_awarded: number;
  workers: { id: string; full_name: string; students_handled: number; applications_updated: number }[];
  universities: { university_name: string; applications_submitted: number; offers_received: number; rejections_received: number }[];
}

export interface YearlyReport {
  id: string;
  label: string;
  period_start: string;
  period_end: string;
  version: number;
  payload: ReportPayload;
  generated_at: string;
  generated_by: string;
  approved_at: string | null;
  approved_by: string | null;
}
