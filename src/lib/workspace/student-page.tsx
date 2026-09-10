import "server-only";
import { notFound } from "next/navigation";
import { getStudent, getWorkers, getWorkflowStatuses, getNotes, getDocuments, getActivity, workspaceNow } from "@/lib/supabase/workspace";
import { requireRole, requireSessionUser } from "@/lib/auth/session";
import { assignedWorkers } from "@/types/db";
import { StudentDetail } from "@/components/students/student-detail";
import { StudentEditor } from "@/components/students/student-editor";
import { AssignStaffControl } from "@/components/students/assign-staff-control";
import { ApplicationEditor } from "@/components/applications/application-editor";
import { NotesPanel } from "@/components/students/notes-panel";
import { MutationForm } from "@/components/workspace/mutation-form";
import { ArchivedList } from "@/components/workspace/archived-list";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updateStudentAction, assignWorkersAction, saveApplicationAction, addNoteAction, uploadDocumentAction, archiveRecordAction } from "@/app/workspace/actions";
import { formatDate } from "@/lib/format";

type ArchiveKind = Parameters<typeof archiveRecordAction>[0];

/** Shared server composition; every child receives data and actions as props. */
export async function renderStudentPage(id: string, workspace: "admin" | "staff") {
  const user = workspace === "admin" ? await requireRole(["admin", "superadmin"], { previewAs: "admin" })
    : await requireSessionUser({ previewAs: "staff" });
  // Controls only. The database enforces the same rules: set_archived and the
  // file-opened date both reject non-admins, and archived files reject writes.
  const isAdmin = user.role === "admin" || user.role === "superadmin";
  const student = await getStudent(id, workspace);
  if (!student) notFound();
  const [workers, statuses, allNotes, allDocuments, activity, now] = await Promise.all([
    getWorkers(), getWorkflowStatuses(), getNotes(id), getDocuments(id), getActivity(id, workspace), workspaceNow(),
  ]);
  const notes = allNotes.filter((n) => !n.archived_at);
  const documents = allDocuments.filter((d) => !d.archived_at);
  const archivedFile = Boolean(student.archived_at);
  const manage = isAdmin && !archivedFile;
  const archiveButton = (kind: ArchiveKind, recordId: string, archive: boolean, label: string) =>
    <MutationForm action={archiveRecordAction.bind(null, kind, recordId, archive)} submitLabel={label} variant="outline" size="sm" />;
  const archivedOn = (value?: string | null) => value ? `Archived ${formatDate(value)}` : "Archived";

  return <StudentDetail student={student} notes={notes} activity={activity} now={now}
    backHref={`/${workspace}/students`} backLabel={workspace === "admin" ? "All students" : "My students"}
    buildStudentHref={(studentId) => `/${workspace}/students/${studentId}`}
    noticeSlot={archivedFile ? <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-warning-soft p-4 text-warning-soft-foreground">
      <div className="space-y-1"><p className="text-sm font-medium">{archivedOn(student.archived_at)}. This file is read-only.</p>
        <p className="text-sm">Staff can&apos;t see it, and dashboards and new reports leave it out. Restore it to make changes.</p></div>
      {isAdmin ? archiveButton("student", id, false, "Restore student file") : null}
    </div> : undefined}
    assignSlot={workspace === "admin" && !archivedFile ? <AssignStaffControl staff={workers} assignedWorkerIds={assignedWorkers(student).map((w) => w.id)} action={assignWorkersAction.bind(null, id)} /> : undefined}
    detailsSlot={archivedFile ? undefined : <div className="space-y-5">
      <StudentEditor student={student} action={updateStudentAction.bind(null, id)} canEditOpenDate={isAdmin} />
      {manage ? <div className="surface-panel space-y-3 p-5">
        <div className="space-y-1"><h3 className="text-sm font-semibold">Archive this student file</h3>
          <p className="text-sm text-muted-foreground">Hides the file from staff, dashboards and new reports. Nothing is deleted, and you can restore it from Students → Archived student files.</p></div>
        {archiveButton("student", id, true, "Archive student file")}
      </div> : null}
    </div>}
    applicationsSlot={archivedFile ? undefined : <div className="space-y-4">
      {student.applications.length ? student.applications.map((app) => <div key={`${app.id}-${app.updated_at}`} className="space-y-2">
        <ApplicationEditor application={app} statuses={statuses} action={saveApplicationAction.bind(null, id, app.id)} />
        {manage ? archiveButton("application", app.id, true, "Archive application") : null}
      </div>) : <p className="text-sm text-muted-foreground">No university applications yet. Add the first one below.</p>}
      <ApplicationEditor statuses={statuses} action={saveApplicationAction.bind(null, id, null)} />
      {manage ? <ArchivedList title="Archived applications" items={(student.archived_applications ?? []).map((app) => ({
        id: app.id, label: app.university_name, detail: archivedOn(app.archived_at), action: archiveButton("application", app.id, false, "Restore") }))} /> : null}
    </div>}
    notesSlot={<div className="space-y-5">
      <NotesPanel notes={notes} renderActions={manage ? (note) => archiveButton("note", note.id, true, "Archive note") : undefined} />
      {archivedFile ? null : <MutationForm action={addNoteAction.bind(null, id)} submitLabel="Add note">
        <Label htmlFor="new-note">New note</Label><Textarea id="new-note" name="body" required maxLength={10000} rows={4} />
      </MutationForm>}
      {manage ? <ArchivedList title="Archived notes" items={allNotes.filter((n) => n.archived_at).map((note) => ({
        id: note.id, label: note.body.length > 120 ? `${note.body.slice(0, 120)}…` : note.body,
        detail: `${note.author_name} · ${archivedOn(note.archived_at)}`, action: archiveButton("note", note.id, false, "Restore") }))} /> : null}
    </div>}
    documentsSlot={<div className="space-y-5">
      {documents.length ? <ul className="divide-y">{documents.map((doc) => <li key={doc.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
        <div className="min-w-0"><p className="break-words text-sm font-medium">{doc.name}</p><p className="text-xs text-muted-foreground">{Math.ceil(doc.size_bytes / 1024)} KB · {formatDate(doc.created_at)}</p></div>
        <div className="flex flex-wrap items-center gap-2">
          {doc.download_url ? <Button variant="outline" nativeButton={false} render={<a href={doc.download_url}>Download</a>} /> : null}
          {manage ? archiveButton("document", doc.id, true, "Archive") : null}
        </div>
      </li>)}</ul> : <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>}
      {archivedFile ? null : <MutationForm action={uploadDocumentAction.bind(null, id)} submitLabel="Upload document">
        <Label htmlFor="document-file">PDF or image, up to 4 MB</Label><Input id="document-file" type="file" name="file" required accept="application/pdf,image/jpeg,image/png,image/webp" />
      </MutationForm>}
      {manage ? <ArchivedList title="Archived documents" items={allDocuments.filter((d) => d.archived_at).map((doc) => ({
        id: doc.id, label: doc.name, detail: archivedOn(doc.archived_at), action: archiveButton("document", doc.id, false, "Restore") }))} /> : null}
    </div>}
  />;
}
