"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isUiPreview } from "@/lib/supabase/env";
import { dateField, emailField, optionalUuid, textField, urlField, uuid } from "@/lib/workspace/input";
import { DECISION_STATUSES, isApplicantType, PRE_ENROLLMENT_STATUS_LABELS, PROGRAM_LABELS, SPONSORSHIP_LABELS, VISA_STATUS_LABELS } from "@/types/db";
import { isGender, type ActionState } from "@/types/workspace";
import { isNotePriority } from "@/types/ui";

type Client = Awaited<ReturnType<typeof createClient>>;
type Result = ActionState & { id?: string };

async function mutate(adminOnly: boolean, change: (client: Client) => Promise<string | void>): Promise<Result> {
  const user = await getSessionUser();
  if (!user || (adminOnly && user.role !== "admin" && user.role !== "superadmin")) return { error: "You do not have permission to make this change." };
  if (isUiPreview()) return { error: "Preview mode: changes are not saved. Use a configured workspace to save records." };
  try {
    const id = await change(await createClient());
    revalidatePath("/", "layout");
    return { error: null, message: "Saved.", ...(id ? { id } : {}) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "The change could not be saved." };
  }
}

function check(error: { code?: string; message: string } | null) {
  if (!error) return;
  if (error.code === "42501" || error.code === "23503") throw new Error("That record is unavailable or you do not have permission to change it.");
  if (error.code === "23505") throw new Error("A record with these details already exists.");
  if (error.code === "23514") throw new Error("Check the dates and status values. Admission can only be confirmed for an accepted application.");
  if (error.code === "P0001") throw new Error(error.message);
  console.error("Workspace write failed:", error.code, error.message);
  throw new Error("The record could not be saved. Check that the workspace migrations have been applied.");
}

function applicantType(data: FormData, required: boolean) {
  const value = textField(data, "applicant_type", 20).replace("__unset", "");
  if (!value && !required) return null;
  if (!isApplicantType(value)) throw new Error("Choose whether the applicant is EU Equivalent or International.");
  return value;
}

function choice<T extends string>(data: FormData, name: string, labels: Record<T, string>, message: string): T | null {
  const value = textField(data, name, 20).replace("__unset", "");
  if (!value) return null;
  if (!Object.hasOwn(labels, value)) throw new Error(message);
  return value as T;
}

/** The optional detail fields from StudentDetailsFields. Hidden visa and sponsor boxes are absent from the form, so they clear. */
function studentDetails(data: FormData) {
  const agencyEmail = textField(data, "agency_email", 320);
  if (agencyEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(agencyEmail)) throw new Error("Enter a valid agency Gmail address.");
  const chargeText = textField(data, "file_opening_charge_percent", 10).replace("%", "").trim();
  const charge = chargeText ? Number(chargeText) : null;
  if (charge !== null && (!Number.isFinite(charge) || charge < 0 || charge > 100)) throw new Error("Enter the file opening charge as a percentage from 0 to 100.");
  const visaDate = dateField(data, "visa_appointment_date");
  const submitted = visaDate ? choice(data, "visa_file_submitted", { yes: "Yes", no: "No" }, "Choose Yes or No for visa file submission.") : null;
  const sponsorship = choice(data, "sponsorship", SPONSORSHIP_LABELS, "Choose Self or Sponsor.");
  const sponsored = sponsorship === "sponsor";
  return {
    email: emailField(data), agency_email: agencyEmail, file_opening_charge_percent: charge,
    passport_number: textField(data, "passport_number", 60), referral: textField(data, "referral", 200),
    intake_session: textField(data, "intake_session", 60),
    program: choice(data, "program", PROGRAM_LABELS, "Choose Bachelor or Master."),
    pre_enrollment_status: choice(data, "pre_enrollment_status", PRE_ENROLLMENT_STATUS_LABELS, "Choose a pre-enrollment summary status."),
    visa_appointment_date: visaDate, visa_file_submitted: submitted ? submitted === "yes" : null,
    visa_status: visaDate ? choice(data, "visa_status", VISA_STATUS_LABELS, "Choose Approved or Rejected for the visa status.") : null,
    visa_country: textField(data, "visa_country", 100), date_of_birth: dateField(data, "date_of_birth"),
    birth_place: textField(data, "birth_place", 200), tax_code: textField(data, "tax_code", 40),
    father_name: textField(data, "father_name", 200), mother_name: textField(data, "mother_name", 200),
    permanent_address: textField(data, "permanent_address", 500), present_address: textField(data, "present_address", 500),
    sponsorship,
    sponsor_name: sponsored ? textField(data, "sponsor_name", 200, 1) : "",
    sponsor_relationship: sponsored ? textField(data, "sponsor_relationship", 200, 1) : "",
  };
}

/** Admin or active staff. The database assigns a staff-opened file to its opener, dates it today and drops any Drive link. */
export async function createStudentAction(_state: ActionState, data: FormData): Promise<ActionState> {
  const user = await getSessionUser();
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const result = await mutate(false, async (client) => {
    // One worker from the dropdown, or none. Further workers can be added on the file.
    const worker = isAdmin ? optionalUuid(textField(data, "worker_id", 36)) : null;
    const gender = textField(data, "gender", 20).replace("__unset", "");
    if (!isGender(gender)) throw new Error("Choose the student's sex.");
    const { data: id, error } = await client.rpc("create_student", {
      p_first_name: textField(data, "first_name", 100, 1), p_surname: textField(data, "surname", 100, 1),
      p_phone: textField(data, "phone", 80, 1), p_gender: gender,
      p_file_opened_at: isAdmin ? dateField(data, "file_opened_at", true) : null,
      p_applicant_type: applicantType(data, false), p_drive_link: isAdmin ? urlField(data, "drive_link", true) ?? "" : "",
      p_worker_ids: worker ? [worker] : [], p_details: studentDetails(data),
    });
    check(error);
    return String(id);
  });
  if (result.id) redirect(`/${isAdmin ? "admin" : "staff"}/students/${result.id}`);
  return result;
}

export async function updateStudentAction(studentId: string, _state: ActionState, data: FormData): Promise<ActionState> {
  return mutate(false, async (client) => {
    const gender = textField(data, "gender", 20).replace("__unset", "");
    if (gender && !isGender(gender)) throw new Error("Choose the student's sex.");
    // Staff forms omit the file-opened date and Drive link; database triggers reject a non-admin change anyway.
    const { data: row, error } = await client.from("students").update({
      first_name: textField(data, "first_name", 100, 1), surname: textField(data, "surname", 100, 1),
      phone: textField(data, "phone", 80), photo_url: urlField(data, "photo_url", true),
      applicant_type: applicantType(data, false), gender: gender || null, ...studentDetails(data),
      ...(data.has("file_opened_at") ? { file_opened_at: dateField(data, "file_opened_at", true) } : {}),
      ...(data.has("drive_link") ? { drive_link: urlField(data, "drive_link", true) } : {}),
    }).eq("id", uuid(studentId)).select("id").maybeSingle();
    check(error);
    if (!row) throw new Error("Student unavailable or access changed. Reload the file.");
  });
}

/** Clears this admin's "new student file" notifications up to the newest one they were shown. */
export async function markStudentFilesSeenAction(until: string, _state: ActionState, _data: FormData): Promise<ActionState> {
  void _state; void _data;
  return mutate(true, async (client) => {
    if (Number.isNaN(Date.parse(until))) throw new Error("Reload the dashboard and try again.");
    const { error } = await client.rpc("mark_student_files_seen", { p_until: until });
    check(error);
  });
}

export async function assignWorkersAction(studentId: string, _state: ActionState, data: FormData): Promise<ActionState> {
  return mutate(true, async (client) => {
    const { error } = await client.rpc("set_student_workers", { p_student_id: uuid(studentId),
      p_worker_ids: data.getAll("worker_ids").map((value) => uuid(String(value))) });
    check(error);
  });
}

export async function saveApplicationAction(studentId: string, applicationId: string | null, _state: ActionState, data: FormData): Promise<ActionState> {
  return mutate(false, async (client) => {
    const decision = textField(data, "decision_status", 20);
    if (!DECISION_STATUSES.some((value) => value === decision)) throw new Error("Choose a valid university decision.");
    const confirmed = data.get("admission_confirmed") === "on";
    if (confirmed && decision !== "accepted") throw new Error("Admission can only be confirmed once the university decision is Approved.");
    const values = {
      university_name: textField(data, "university_name", 240, 2), application_link: urlField(data, "application_link"),
      preferred_subject: textField(data, "preferred_subject", 200), entrance_exam: textField(data, "entrance_exam", 200),
      entrance_exam_date: dateField(data, "entrance_exam_date"),
      application_status_id: optionalUuid(textField(data, "application_status_id", 36)),
      scholarship_status_id: optionalUuid(textField(data, "scholarship_status_id", 36)),
      scholarship_name: textField(data, "scholarship_name", 240), scholarship_link: urlField(data, "scholarship_link"),
      decision_status: decision, admission_confirmed: confirmed, enrollment_fee_paid: data.get("enrollment_fee_paid") === "on",
    };
    const query = applicationId
      ? client.from("university_applications").update(values).eq("id", uuid(applicationId)).eq("student_id", uuid(studentId))
      : client.from("university_applications").insert({ ...values, student_id: uuid(studentId) });
    const { data: row, error } = await query.select("id").maybeSingle();
    check(error);
    if (!row) throw new Error("Application unavailable or access changed. Reload the file.");
  });
}

/** Admin or assigned staff. The database requires a reason and an open, accessible file. */
export async function closeStudentFileAction(studentId: string, _state: ActionState, data: FormData): Promise<ActionState> {
  return mutate(false, async (client) => {
    const { error } = await client.rpc("close_student_file", { p_id: uuid(studentId), p_reason: textField(data, "reason", 2000, 3) });
    check(error);
  });
}

export async function reopenStudentFileAction(studentId: string, _state: ActionState, _data: FormData): Promise<ActionState> {
  void _state; void _data;
  return mutate(true, async (client) => {
    const { error } = await client.rpc("reopen_student_file", { p_id: uuid(studentId) });
    check(error);
  });
}

export async function saveWorkerAction(workerId: string, _state: ActionState, data: FormData): Promise<ActionState> {
  return mutate(true, async (client) => {
    const status = textField(data, "status", 20);
    if (status !== "active" && status !== "inactive") throw new Error("Choose an account status.");
    const gender = textField(data, "gender", 20).replace("__unset", "");
    if (gender && !isGender(gender)) throw new Error("Choose a gender.");
    const { error } = await client.rpc("save_worker", { p_worker_id: uuid(workerId), p_full_name: textField(data, "full_name", 200, 2),
      p_phone: textField(data, "phone", 80), p_joined_on: dateField(data, "joined_on"), p_left_on: dateField(data, "left_on"), p_status: status,
      p_gender: gender, p_address: textField(data, "address", 500) });
    check(error);
  });
}

/** "link" applies a staff-form request to the existing account with that email; "dismiss" closes it. */
export async function resolveStaffRegistrationAction(id: string, action: "link" | "dismiss", _state: ActionState, _data: FormData): Promise<ActionState> {
  void _state; void _data;
  return mutate(true, async (client) => {
    const { error } = await client.rpc("resolve_staff_registration", { p_id: uuid(id), p_action: action === "link" ? "link" : "dismiss" });
    check(error);
  });
}

export async function addStatusAction(_state: ActionState, data: FormData): Promise<ActionState> {
  return mutate(true, async (client) => {
    const { error } = await client.rpc("add_workflow_status", { p_category: textField(data, "category", 20),
      p_label: textField(data, "label", 80, 1), p_submitted: data.get("counts_as_submitted") === "on", p_awarded: data.get("counts_as_awarded") === "on" });
    check(error);
  });
}
export async function archiveStatusAction(id: string, archived: boolean, _state: ActionState, _data: FormData): Promise<ActionState> {
  void _state; void _data;
  return mutate(true, async (client) => { const { error } = await client.rpc("archive_workflow_status", { p_id: uuid(id), p_archived: archived }); check(error); });
}

export async function addNoteAction(studentId: string, _state: ActionState, data: FormData): Promise<ActionState> {
  return mutate(false, async (client) => {
    const priority = textField(data, "priority", 20).replace("__unset", "") || "normal";
    if (!isNotePriority(priority)) throw new Error("Choose Urgent, Moderate or Normal.");
    const { error } = await client.from("student_notes").insert({ student_id: uuid(studentId), body: textField(data, "body", 10000, 1), priority });
    check(error);
  });
}

/** Admin or assigned staff, on an open file. The database checks access and that the note is Urgent/Moderate and unresolved. */
export async function resolveNoteAction(noteId: string, _state: ActionState, _data: FormData): Promise<ActionState> {
  void _state; void _data;
  return mutate(false, async (client) => {
    const { error } = await client.rpc("resolve_student_note", { p_id: uuid(noteId) });
    check(error);
  });
}

export async function uploadDocumentAction(studentId: string, _state: ActionState, data: FormData): Promise<ActionState> {
  return mutate(false, async (client) => {
    uuid(studentId);
    const file = data.get("file");
    if (!(file instanceof File) || !file.size || file.size > 4 * 1024 * 1024) throw new Error("Choose a PDF or image up to 4 MB.");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const prefix = Buffer.from(bytes.slice(0, 12));
    const format = prefix.subarray(0, 5).toString() === "%PDF-" ? ["application/pdf", "pdf"]
      : prefix.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? ["image/png", "png"]
      : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 ? ["image/jpeg", "jpg"]
      : prefix.subarray(0, 4).toString() === "RIFF" && prefix.subarray(8, 12).toString() === "WEBP" ? ["image/webp", "webp"] : null;
    if (!format) throw new Error("Supported documents are PDF, JPEG, PNG and WebP.");
    const storagePath = `${studentId}/${crypto.randomUUID()}.${format[1]}`;
    const { error: uploadError } = await client.storage.from("student-documents").upload(storagePath, bytes, { contentType: format[0], upsert: false });
    check(uploadError);
    const { error } = await client.from("student_documents").insert({ student_id: studentId, storage_path: storagePath,
      name: file.name.replace(/[\\/\x00-\x1f\x7f]/g, "_").slice(0, 240) || `Document.${format[1]}`, mime_type: format[0], size_bytes: file.size });
    if (error) {
      await client.storage.from("student-documents").remove([storagePath]);
      check(error);
    }
  });
}

const ARCHIVE_KINDS = ["student", "application", "note", "document", "important_document"] as const;
/** Admin only (RLS and the action). A null id adds a new document. */
export async function saveImportantDocumentAction(documentId: string | null, _state: ActionState, data: FormData): Promise<ActionState> {
  return mutate(true, async (client) => {
    const url = urlField(data, "url", true);
    if (!url) throw new Error("Enter the document's HTTPS link.");
    const order = Number(textField(data, "sort_order", 6) || "0");
    if (!Number.isInteger(order) || order < 0 || order > 9999) throw new Error("Enter the position as a whole number from 0 to 9999.");
    const values = { title: textField(data, "title", 200, 1), url, sort_order: order };
    const query = documentId
      ? client.from("important_documents").update(values).eq("id", uuid(documentId))
      : client.from("important_documents").insert(values);
    const { data: row, error } = await query.select("id").maybeSingle();
    check(error);
    if (!row) throw new Error("Document unavailable or archived. Reload the page.");
  });
}

export async function archiveRecordAction(kind: (typeof ARCHIVE_KINDS)[number], id: string, archived: boolean, _state: ActionState, _data: FormData): Promise<ActionState> {
  void _state; void _data;
  return mutate(true, async (client) => {
    if (!ARCHIVE_KINDS.includes(kind)) throw new Error("Unknown record type.");
    const { error } = await client.rpc("set_archived", { p_kind: kind, p_id: uuid(id), p_archived: archived === true });
    check(error);
  });
}

export async function createReportAction(_state: ActionState, data: FormData): Promise<ActionState> {
  const result = await mutate(true, async (client) => {
    const { data: id, error } = await client.rpc("create_yearly_report", { p_label: textField(data, "label", 120, 1),
      p_start: dateField(data, "period_start", true), p_end: dateField(data, "period_end", true) });
    check(error); return String(id);
  });
  if (result.id) redirect(`/admin/reports/${result.id}`);
  return result;
}
export async function refreshReportAction(id: string, _state: ActionState, _data: FormData): Promise<ActionState> {
  void _state; void _data;
  return mutate(true, async (client) => { const { error } = await client.rpc("refresh_yearly_report", { p_id: uuid(id) }); check(error); });
}
export async function approveReportAction(id: string, generatedAt: string, _state: ActionState, _data: FormData): Promise<ActionState> {
  void _state; void _data;
  return mutate(true, async (client) => { const { error } = await client.rpc("approve_yearly_report", { p_id: uuid(id), p_generated_at: generatedAt }); check(error); });
}
