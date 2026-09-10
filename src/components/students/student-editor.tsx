import { TextField } from "@/components/workspace/text-field";
import { MutationForm } from "@/components/workspace/mutation-form";
import { formatDate } from "@/lib/format";
import type { StudentWithApplications } from "@/types/db";
import type { FormAction } from "@/types/workspace";

/** `canEditOpenDate` only shapes the form; the database rejects a non-admin date change regardless. */
export function StudentEditor({ student, action, canEditOpenDate }: { student: StudentWithApplications; action: FormAction; canEditOpenDate: boolean }) {
  return <MutationForm action={action} submitLabel="Save student details" className="surface-panel p-5"><div className="grid gap-4 sm:grid-cols-2">
    <TextField name="full_name" label="Full name" value={student.full_name} required minLength={2} maxLength={200} />
    {canEditOpenDate ? <TextField name="file_opened_at" label="File opened" value={student.file_opened_at.slice(0, 10)} type="date" required />
      : <div className="space-y-2"><p className="text-sm font-medium">File opened</p>
        <p className="text-sm">{formatDate(student.file_opened_at)}</p>
        <p className="text-xs text-muted-foreground">Only an admin can change this date.</p></div>}
    <TextField name="email" label="Email" value={student.email ?? ""} type="email" maxLength={320} />
    <TextField name="phone" label="Phone" value={student.phone ?? ""} type="tel" maxLength={80} />
    <TextField name="photo_url" label="Photo URL (HTTPS, optional)" value={student.photo_url ?? ""} type="url" maxLength={2048} />
  </div></MutationForm>;
}
