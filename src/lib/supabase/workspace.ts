import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { isUiPreview } from "@/lib/supabase/env";
import { assignedWorkers, type Staff, type StudentWithApplications, type UniversityApplication } from "@/types/db";
import type { ActivityEvent, StudentNote } from "@/types/ui";
import type { StudentDocument, WorkflowStatus, YearlyReport } from "@/types/workspace";
import { applicationRows, dashboardStats, needsAttention, staffWorkload } from "@/lib/workspace/selectors";

type Profile = Staff & { status: "active" | "inactive" };
type StudentRow = Omit<StudentWithApplications, "applications" | "archived_applications" | "assigned_workers" | "assigned_staff" | "assigned_staff_id">;
type Application = UniversityApplication & { application_status_id: string | null; scholarship_status_id: string | null };
type Assignment = { id: string; student_id: string; worker_id: string; assigned_at: string; ended_at: string | null };
type WorkerDetails = { profile_id: string; phone: string; joined_on: string | null; left_on: string | null };
type History = { id: string; application_id: string; student_id: string; actor_id: string | null; occurred_at: string; before_data: UniversityApplication | null; after_data: UniversityApplication };

function databaseError(message: string): never {
  console.error("Workspace data read failed:", message);
  throw new Error("The workspace data is unavailable. Check the database connection and apply the workspace migrations.");
}

/** Paginate explicitly: the Data API's row limit must never silently shrink a roster or dashboard. */
async function readRows<T>(table: string, columns = "*", key = "id"): Promise<T[]> {
  const client = await createClient();
  const rows: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await client.from(table).select(columns).order(key).range(from, from + 999);
    if (error) databaseError(error.message);
    rows.push(...(data as unknown as T[]));
    if (data.length < 1000) return rows;
  }
}

/** Runs exclusively as the signed-in account. RLS scopes every table read. */
const readWorkspace = cache(async () => {
  if (isUiPreview()) {
    const fixtures = await import("@/lib/mock/students");
    const { APPLICATION_STATUS_LABELS, SCHOLARSHIP_STATUS_LABELS } = await import("@/types/db");
    const workers = (await fixtures.getMockStaff()).map((w) => ({ ...w, status: "active" as const }));
    const students = (await fixtures.getMockStudents()).map((s) => ({ ...s,
      assigned_workers: assignedWorkers(s),
      applications: s.applications.map((a) => ({ ...a,
        is_submitted: a.application_status === "submitted" || a.application_status === "under_review",
        is_awarded: a.scholarship_status === "awarded",
        application_status_id: a.application_status, scholarship_status_id: a.scholarship_status,
      })),
    }));
    const statuses: WorkflowStatus[] = [
      ...Object.entries(APPLICATION_STATUS_LABELS).map(([id, label]) => ({ id, label, category: "application" as const,
        counts_as_submitted: id === "submitted" || id === "under_review", counts_as_awarded: false, archived: false })),
      ...Object.entries(SCHOLARSHIP_STATUS_LABELS).map(([id, label]) => ({ id, label, category: "scholarship" as const,
        counts_as_submitted: false, counts_as_awarded: id === "awarded", archived: false })),
    ];
    return { students, workers, profiles: workers, statuses };
  }
  const [profiles, details, rows, applications, assignments, statuses] = await Promise.all([
    readRows<Profile>("profiles", "id,full_name,email,role,status,avatar_url,created_at"),
    readRows<WorkerDetails>("worker_details", "*", "profile_id"),
    readRows<StudentRow>("students"), readRows<Application>("university_applications"),
    readRows<Assignment>("student_staff_assignments"), readRows<WorkflowStatus>("workflow_statuses"),
  ]);
  const statusById = new Map(statuses.map((s) => [s.id, s]));
  const workers = profiles.filter((p) => p.role === "staff").map((p) => ({ ...p, auth_user_id: p.id,
    ...details.find((d) => d.profile_id === p.id) }));
  const students: StudentWithApplications[] = rows.map((student) => {
    const assigned = assignments.filter((a) => a.student_id === student.id && !a.ended_at)
      .map((a) => profiles.find((p) => p.id === a.worker_id)).filter((p): p is Profile => !!p)
      .map((p) => ({ id: p.id, full_name: p.full_name, avatar_url: p.avatar_url, status: p.status }));
    return { ...student, assigned_workers: assigned, assigned_staff_id: assigned[0]?.id ?? null,
      assigned_staff: assigned[0] ?? null, applications: applications.filter((a) => a.student_id === student.id).map((a) => ({ ...a,
        application_status: statusById.get(a.application_status_id ?? "")?.label ?? "",
        scholarship_status: statusById.get(a.scholarship_status_id ?? "")?.label ?? "",
      })).sort((a, b) => b.updated_at.localeCompare(a.updated_at)) };
  });
  return { students: students.sort((a, b) => b.file_opened_at.localeCompare(a.file_opened_at)), workers, profiles, statuses };
});

/**
 * Admin reads include archived rows (staff never receive them — RLS). Every
 * list, dashboard and count works on open records; archived applications are
 * split off for the admin's restore list.
 */
function openView(student: StudentWithApplications): StudentWithApplications {
  return { ...student, applications: student.applications.filter((a) => !a.archived_at),
    archived_applications: student.applications.filter((a) => a.archived_at) };
}

export async function getStudents(previewAs: "admin" | "staff" = "admin") {
  const students = (await readWorkspace()).students.filter((s) => !s.archived_at).map(openView);
  if (isUiPreview() && previewAs === "staff") {
    const { MOCK_CURRENT_STAFF_ID } = await import("@/lib/mock/students");
    return students.filter((s) => assignedWorkers(s).some((w) => w.id === MOCK_CURRENT_STAFF_ID));
  }
  return students;
}
/** Unlike getStudents, returns an archived file too, so an admin can open and restore it. */
export async function getStudent(id: string, previewAs: "admin" | "staff" = "admin") {
  const student = (await readWorkspace()).students.find((s) => s.id === id);
  if (!student || (isUiPreview() && previewAs === "staff" && !(await getStudents("staff")).some((s) => s.id === id))) return null;
  return openView(student);
}
export async function getArchivedStudents() {
  return (await readWorkspace()).students.filter((s) => s.archived_at).map(openView);
}
export async function getWorkers() { return (await readWorkspace()).workers; }
export async function getWorker(id: string) { return (await getWorkers()).find((w) => w.id === id) ?? null; }
export async function getWorkflowStatuses() { return (await readWorkspace()).statuses; }
export async function getStudentsForWorker(id: string) {
  return (await getStudents()).filter((s) => assignedWorkers(s).some((w) => w.id === id));
}
export async function getDashboardStats(previewAs: "admin" | "staff" = "admin") { return dashboardStats(await getStudents(previewAs)); }
export async function getNeedsAttention(previewAs: "admin" | "staff" = "admin") { return needsAttention(await getStudents(previewAs)); }
export async function getStaffWorkload() { return staffWorkload(await getStudents(), await getWorkers()); }
export async function getStaffWorkloadFor(id: string) { return (await getStaffWorkload()).find((w) => w.staff.id === id) ?? null; }
export async function getApplications() { return applicationRows(await getStudents()); }
export async function workspaceNow() {
  if (isUiPreview()) return (await import("@/lib/mock/students")).MOCK_NOW.toISOString();
  return new Date().toISOString();
}

export async function getActivity(studentId?: string, previewAs: "admin" | "staff" = "admin"): Promise<ActivityEvent[]> {
  if (studentId && !(await getStudent(studentId, previewAs))) return [];
  if (isUiPreview()) {
    const fixtures = await import("@/lib/mock/activity");
    return studentId ? fixtures.getMockActivityForStudent(studentId) : fixtures.getMockActivityForStudents((await getStudents(previewAs)).map((s) => s.id), 8);
  }
  const client = await createClient();
  // Over-fetch the global feed: an admin's rows can include archived records, filtered out below.
  let query = client.from("application_history").select("*").order("occurred_at", { ascending: false }).limit(studentId ? 100 : 40);
  if (studentId) query = query.eq("student_id", studentId);
  const { data, error } = await query;
  if (error) databaseError(error.message);
  const { profiles, students } = await readWorkspace();
  const archivedApplications = new Set(students.flatMap((s) => s.applications.filter((a) => a.archived_at).map((a) => a.id)));
  const archivedStudents = new Set(students.filter((s) => s.archived_at).map((s) => s.id));
  return (data as History[]).filter((event) => !archivedApplications.has(event.application_id)
    && (studentId || !archivedStudents.has(event.student_id))).slice(0, studentId ? 100 : 8).map((event) => ({ id: event.id,
    kind: event.before_data ? "application_status_changed" : "application_added",
    student_id: event.student_id, student_name: students.find((s) => s.id === event.student_id)?.full_name ?? "Student",
    actor_name: profiles.find((p) => p.id === event.actor_id)?.full_name ?? null,
    university_name: event.after_data.university_name,
    summary: event.before_data ? "Application updated" : "University application added", occurred_at: event.occurred_at,
  }));
}

export async function getNotes(studentId: string): Promise<StudentNote[]> {
  if (isUiPreview()) return (await import("@/lib/mock/activity")).getMockNotesForStudent(studentId);
  const client = await createClient();
  const { data, error } = await client.from("student_notes").select("*").eq("student_id", studentId).order("created_at", { ascending: false });
  if (error) databaseError(error.message);
  const { profiles } = await readWorkspace();
  return data.map((n) => ({ id: n.id, student_id: n.student_id, body: n.body, created_at: n.created_at, archived_at: n.archived_at,
    author_name: profiles.find((p) => p.id === n.author_id)?.full_name ?? "Team member" }));
}

export async function getDocuments(studentId: string): Promise<StudentDocument[]> {
  if (isUiPreview()) return [];
  const client = await createClient();
  const { data, error } = await client.from("student_documents").select("*").eq("student_id", studentId).order("created_at", { ascending: false });
  if (error) databaseError(error.message);
  return data.map((d) => ({ id: d.id, name: d.name, size_bytes: d.size_bytes, mime_type: d.mime_type,
    created_at: d.created_at, archived_at: d.archived_at, download_url: `/documents/${d.id}` }));
}

export async function getReports(): Promise<YearlyReport[]> {
  if (isUiPreview()) return [];
  return (await readRows<YearlyReport>("yearly_reports")).sort((a, b) => b.generated_at.localeCompare(a.generated_at));
}
export async function getReport(id: string) { return (await getReports()).find((r) => r.id === id) ?? null; }
