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
