import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/workspace/text-field";
import { MutationForm, SelectField } from "@/components/workspace/mutation-form";
import { StudentDetailsFields } from "@/components/students/student-details-fields";
import { formatDate } from "@/lib/format";
import { APPLICANT_TYPE_LABELS, type Staff } from "@/types/db";
import { GENDER_LABELS, type FormAction } from "@/types/workspace";

export const APPLICANT_TYPE_OPTIONS = Object.entries(APPLICANT_TYPE_LABELS).map(([value, label]) => ({ value, label }));
export const GENDER_OPTIONS = Object.entries(GENDER_LABELS).map(([value, label]) => ({ value, label }));

/**
 * `isAdmin` only shapes the form. For staff the database dates the file today,
 * leaves the Drive link empty and assigns it to the staff member who opened it.
 */
export function StudentForm({ staff, defaultFileOpenedAt, cancelHref, action, isAdmin }: {
  staff: Staff[]; defaultFileOpenedAt: string; cancelHref: string; action: FormAction; isAdmin: boolean;
}) {
  const active = staff.filter((w) => w.status !== "inactive");
  return <div className="space-y-4"><MutationForm action={action} submitLabel="Open student file" className="surface-panel p-5">
    <div className="grid gap-4 sm:grid-cols-2">
      <TextField name="first_name" label="Name" required minLength={1} maxLength={100} />
      <TextField name="surname" label="Surname" required minLength={1} maxLength={100} />
      <TextField name="phone" label="Phone number" type="tel" required minLength={1} maxLength={80} />
      <SelectField name="gender" label="Sex" options={[{ value: "", label: "Choose…" }, ...GENDER_OPTIONS]} />
      {isAdmin ? <TextField name="file_opened_at" label="File opened" type="date" required value={defaultFileOpenedAt} />
        : <div className="space-y-2"><p className="text-sm font-medium">File opened</p><p className="text-sm">{formatDate(defaultFileOpenedAt)}</p></div>}
      <SelectField name="applicant_type" label="Applicant from" options={[{ value: "", label: "Not set" }, ...APPLICANT_TYPE_OPTIONS]} />
      {isAdmin ? <>
        <div className="sm:col-span-2"><TextField name="drive_link" label="Drive link (optional)" type="url" maxLength={2048} /></div>
        <div className="sm:col-span-2 space-y-2">
          <SelectField name="worker_id" label="Assign worker" options={[{ value: "", label: "Unassigned" }, ...active.map((w) => ({ value: w.id, label: w.full_name }))]} />
          <p className="text-sm text-muted-foreground">{active.length ? "You can add or change workers later on the student file." : "Invite a worker to start assigning files."}</p>
        </div>
      </> : <p className="text-sm text-muted-foreground sm:col-span-2">The file is assigned to you. An admin adds the Drive link.</p>}
      <p className="text-sm text-muted-foreground sm:col-span-2">Only Name, Surname, Phone number and Sex are required. Everything below can be filled in later on the student file.</p>
      <StudentDetailsFields />
    </div>
  </MutationForm><Button nativeButton={false} variant="outline" render={<Link href={cancelHref}>Cancel</Link>} /></div>;
}
