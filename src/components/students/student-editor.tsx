import { TextField } from "@/components/workspace/text-field";
import { MutationForm, SelectField } from "@/components/workspace/mutation-form";
import { APPLICANT_TYPE_OPTIONS, GENDER_OPTIONS } from "@/components/students/student-form";
import { StudentDetailsFields } from "@/components/students/student-details-fields";
import { formatDate } from "@/lib/format";
import type { StudentWithApplications } from "@/types/db";
import type { FormAction } from "@/types/workspace";

/** `isAdmin` only shapes the form; the database rejects a non-admin change to the date or Drive link regardless. */
export function StudentEditor({ student, action, isAdmin }: { student: StudentWithApplications; action: FormAction; isAdmin: boolean }) {
  return <MutationForm action={action} submitLabel="Save student details" className="surface-panel p-5"><div className="grid gap-4 sm:grid-cols-2">
    <TextField name="first_name" label="Name" value={student.first_name ?? student.full_name} required minLength={1} maxLength={100} />
    <TextField name="surname" label="Surname" value={student.surname ?? ""} required minLength={1} maxLength={100} />
    <TextField name="phone" label="Phone number" value={student.phone ?? ""} type="tel" maxLength={80} />
    <SelectField name="gender" label="Sex" defaultValue={student.gender ?? ""} options={[{ value: "", label: "Not set" }, ...GENDER_OPTIONS]} />
    {isAdmin ? <TextField name="file_opened_at" label="File opened" value={student.file_opened_at.slice(0, 10)} type="date" required />
      : <div className="space-y-2"><p className="text-sm font-medium">File opened</p>
        <p className="text-sm">{formatDate(student.file_opened_at)}</p>
        <p className="text-xs text-muted-foreground">Only an admin can change this date.</p></div>}
    <SelectField name="applicant_type" label="Applicant from" defaultValue={student.applicant_type ?? ""}
      options={[{ value: "", label: "Not set" }, ...APPLICANT_TYPE_OPTIONS]} />
    {isAdmin ? <TextField name="drive_link" label="Drive link (HTTPS, optional)" value={student.drive_link ?? ""} type="url" maxLength={2048} />
      : <div className="space-y-2"><p className="text-sm font-medium">Drive link</p>
        <p className="text-sm text-muted-foreground">{student.drive_link ? "Shown at the top of the file." : "Not added yet."} Only an admin can change it.</p></div>}
    <TextField name="photo_url" label="Photo URL (HTTPS, optional)" value={student.photo_url ?? ""} type="url" maxLength={2048} />
    <StudentDetailsFields student={student} />
  </div></MutationForm>;
}
