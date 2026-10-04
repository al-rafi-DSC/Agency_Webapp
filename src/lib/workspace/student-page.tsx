import "server-only";
import { notFound } from "next/navigation";
import { getStudent, getWorkers, getWorkflowStatuses, getNotes, getActivity, workspaceNow } from "@/lib/supabase/workspace";
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
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updateStudentAction, assignWorkersAction, saveApplicationAction, addNoteAction, archiveRecordAction, closeStudentFileAction, reopenStudentFileAction } from "@/app/workspace/actions";
import { CloseFileDialog } from "@/components/students/close-file-dialog";
import { formatDate } from "@/lib/format";
import { FolderOpenIcon } from "lucide-react";

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
  const [workers, statuses, allNotes, activity, now] = await Promise.all([
    getWorkers(), getWorkflowStatuses(), getNotes(id), getActivity(id, workspace), workspaceNow(),
  ]);
  const notes = allNotes.filter((n) => !n.archived_at);
  const archivedFile = Boolean(student.archived_at);
  const closedFile = Boolean(student.closed_at);
  // Archived and closed files are both read-only; the database enforces it (can_write_student).
  const readOnly = archivedFile || closedFile;
  const manage = isAdmin && !readOnly;
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
    </div> : closedFile ? <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted p-4">
      <div className="min-w-0 space-y-1"><p className="text-sm font-medium">File closed {formatDate(student.closed_at!)}. This file is read-only.</p>
        <p className="text-sm break-words"><span className="text-muted-foreground">Reason:</span> {student.close_reason}</p>
        {isAdmin ? null : <p className="text-xs text-muted-foreground">Only an admin can reopen it.</p>}</div>
      {isAdmin ? <MutationForm action={reopenStudentFileAction.bind(null, id)} submitLabel="Reopen file" variant="outline" size="sm" /> : null}
    </div> : <div className="flex justify-end"><CloseFileDialog action={closeStudentFileAction.bind(null, id)} canReopen={isAdmin} /></div>}
    assignSlot={workspace === "admin" && !readOnly ? <AssignStaffControl staff={workers} assignedWorkerIds={assignedWorkers(student).map((w) => w.id)} action={assignWorkersAction.bind(null, id)} /> : undefined}
    detailsSlot={readOnly ? undefined : <div className="space-y-5">
      <StudentEditor student={student} action={updateStudentAction.bind(null, id)} isAdmin={isAdmin} />
      {manage ? <div className="surface-panel space-y-3 p-5">
        <div className="space-y-1"><h3 className="text-sm font-semibold">Archive this student file</h3>
          <p className="text-sm text-muted-foreground">Hides the file from staff, dashboards and new reports. Nothing is deleted, and you can restore it from Students → Archived student files.</p></div>
        {archiveButton("student", id, true, "Archive student file")}
      </div> : null}
    </div>}
    applicationsSlot={readOnly ? undefined : <div className="space-y-4">
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
      {readOnly ? null : <MutationForm action={addNoteAction.bind(null, id)} submitLabel="Add note">
        <Label htmlFor="new-note">New note</Label><Textarea id="new-note" name="body" required maxLength={10000} rows={4} />
      </MutationForm>}
      {manage ? <ArchivedList title="Archived notes" items={allNotes.filter((n) => n.archived_at).map((note) => ({
        id: note.id, label: note.body.length > 120 ? `${note.body.slice(0, 120)}…` : note.body,
        detail: `${note.author_name} · ${archivedOn(note.archived_at)}`, action: archiveButton("note", note.id, false, "Restore") }))} /> : null}
    </div>}
    documentsSlot={<div className="space-y-3">
      <p className="text-sm">Upload the documents into the Drive.</p>
      {student.drive_link ? <Button nativeButton={false} render={<a href={student.drive_link} target="_blank" rel="noopener noreferrer">
        <FolderOpenIcon /> Drive Link</a>} />
        : <p className="text-sm text-muted-foreground">No Drive link yet.{isAdmin ? " Add it under Details." : " An admin adds it."}</p>}
    </div>}
  />;
}
