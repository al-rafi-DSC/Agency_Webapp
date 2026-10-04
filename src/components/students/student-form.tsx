import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/workspace/text-field";
import { MutationForm, SelectField } from "@/components/workspace/mutation-form";
import { APPLICANT_TYPE_LABELS, type Staff } from "@/types/db";
import type { FormAction } from "@/types/workspace";

export const APPLICANT_TYPE_OPTIONS = Object.entries(APPLICANT_TYPE_LABELS).map(([value, label]) => ({ value, label }));

export function StudentForm({ staff, defaultFileOpenedAt, cancelHref, action }: {
  staff: Staff[]; defaultFileOpenedAt: string; cancelHref: string; action: FormAction;
}) {
  const active = staff.filter((w) => w.status !== "inactive");
  return <div className="space-y-4"><MutationForm action={action} submitLabel="Open student file" className="surface-panel p-5">
    <div className="grid gap-4 sm:grid-cols-2">
      <TextField name="first_name" label="Name" required minLength={1} maxLength={100} />
      <TextField name="surname" label="Surname" required minLength={1} maxLength={100} />
      <TextField name="file_opened_at" label="File opened" type="date" required value={defaultFileOpenedAt} />
      <TextField name="phone" label="Phone number" type="tel" maxLength={80} />
      <TextField name="email" label="Gmail" type="email" required maxLength={320} />
      <SelectField name="applicant_type" label="Applicant from" options={[{ value: "", label: "Choose…" }, ...APPLICANT_TYPE_OPTIONS]} />
      <div className="sm:col-span-2"><TextField name="drive_link" label="Drive link (optional)" type="url" maxLength={2048} /></div>
      <div className="sm:col-span-2 space-y-2">
        <SelectField name="worker_id" label="Assign worker" options={[{ value: "", label: "Unassigned" }, ...active.map((w) => ({ value: w.id, label: w.full_name }))]} />
        <p className="text-sm text-muted-foreground">{active.length ? "You can add or change workers later on the student file." : "Invite a worker to start assigning files."}</p>
      </div>
    </div>
  </MutationForm><Button nativeButton={false} variant="outline" render={<Link href={cancelHref}>Cancel</Link>} /></div>;
}
