"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isUiPreview } from "@/lib/supabase/env";
import { dateField, emailField, optionalUuid, textField, urlField, uuid } from "@/lib/workspace/input";
import { DECISION_STATUSES } from "@/types/db";
import type { ActionState } from "@/types/workspace";

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

export async function createStudentAction(_state: ActionState, data: FormData): Promise<ActionState> {
  const result = await mutate(true, async (client) => {
    const workers = data.getAll("worker_ids").map((id) => uuid(String(id)));
    const { data: id, error } = await client.rpc("create_student", {
      p_full_name: textField(data, "full_name", 200, 2), p_email: emailField(data),
      p_phone: textField(data, "phone", 80), p_file_opened_at: dateField(data, "file_opened_at", true), p_worker_ids: workers,
    });
    check(error);
    return String(id);
  });
  if (result.id) redirect(`/admin/students/${result.id}`);
  return result;
}

export async function updateStudentAction(studentId: string, _state: ActionState, data: FormData): Promise<ActionState> {
  return mutate(false, async (client) => {
    // Staff forms omit the file-opened date; a database trigger rejects a non-admin change anyway.
    const { data: row, error } = await client.from("students").update({ full_name: textField(data, "full_name", 200, 2),
      email: emailField(data), phone: textField(data, "phone", 80), photo_url: urlField(data, "photo_url", true),
      ...(data.has("file_opened_at") ? { file_opened_at: dateField(data, "file_opened_at", true) } : {}),
    }).eq("id", uuid(studentId)).select("id").maybeSingle();
    check(error);
    if (!row) throw new Error("Student unavailable or access changed. Reload the file.");
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
    if (confirmed && decision !== "accepted") throw new Error("Only an accepted application can have admission confirmed.");
    const values = {
      university_name: textField(data, "university_name", 240, 2), application_link: urlField(data, "application_link"),
      application_status_id: optionalUuid(textField(data, "application_status_id", 36)),
      scholarship_status_id: optionalUuid(textField(data, "scholarship_status_id", 36)),
      decision_status: decision, admission_confirmed: confirmed,
    };
    const query = applicationId
      ? client.from("university_applications").update(values).eq("id", uuid(applicationId)).eq("student_id", uuid(studentId))
      : client.from("university_applications").insert({ ...values, student_id: uuid(studentId) });
    const { data: row, error } = await query.select("id").maybeSingle();
    check(error);
    if (!row) throw new Error("Application unavailable or access changed. Reload the file.");
  });
}

export async function saveWorkerAction(workerId: string, _state: ActionState, data: FormData): Promise<ActionState> {
  return mutate(true, async (client) => {
    const status = textField(data, "status", 20);
    if (status !== "active" && status !== "inactive") throw new Error("Choose an account status.");
    const { error } = await client.rpc("save_worker", { p_worker_id: uuid(workerId), p_full_name: textField(data, "full_name", 200, 2),
      p_phone: textField(data, "phone", 80), p_joined_on: dateField(data, "joined_on"), p_left_on: dateField(data, "left_on"), p_status: status });
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
    const { error } = await client.from("student_notes").insert({ student_id: uuid(studentId), body: textField(data, "body", 10000, 1) });
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

const ARCHIVE_KINDS = ["student", "application", "note", "document"] as const;
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
