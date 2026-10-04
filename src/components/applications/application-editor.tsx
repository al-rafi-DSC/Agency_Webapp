import { TextField } from "@/components/workspace/text-field";
import { CheckField, MutationForm, SelectField } from "@/components/workspace/mutation-form";
import { DECISION_STATUSES, DECISION_STATUS_LABELS, type UniversityApplication } from "@/types/db";
import type { FormAction, WorkflowStatus } from "@/types/workspace";

export function ApplicationEditor({ application, statuses, action }: { application?: UniversityApplication; statuses: WorkflowStatus[]; action: FormAction }) {
  const prefix = application?.id ?? "new";
  const options = (category: WorkflowStatus["category"], selected?: string | null) => [{ value: "", label: "Not set" },
    ...statuses.filter((s) => s.category === category && (!s.archived || s.id === selected)).map((s) => ({ value: s.id, label: s.label + (s.archived ? " (archived)" : "") }))];
  return <MutationForm action={action} submitLabel={application ? "Save application" : "Add university application"} className="surface-panel p-5">
    <div className="grid gap-4 sm:grid-cols-2">
      <TextField prefix={prefix} name="university_name" label="University" required minLength={2} value={application?.university_name ?? ""} />
      <TextField prefix={prefix} name="application_link" label="Application link" type="url" maxLength={2048} value={application?.application_link ?? ""} />
      <TextField prefix={prefix} name="preferred_subject" label="Preferred subject" maxLength={200} value={application?.preferred_subject ?? ""} />
      <TextField prefix={prefix} name="entrance_exam" label="Entrance exam" maxLength={200} value={application?.entrance_exam ?? ""} />
      <TextField prefix={prefix} name="entrance_exam_date" label="Entrance exam booked on" type="date" value={application?.entrance_exam_date ?? ""} />
      <SelectField name="application_status_id" label="Application status" defaultValue={application?.application_status_id ?? ""} options={options("application", application?.application_status_id)} />
      <SelectField name="decision_status" label="University decision" defaultValue={application?.decision_status ?? DECISION_STATUSES[0]} options={DECISION_STATUSES.map((value) => ({ value, label: DECISION_STATUS_LABELS[value] }))} />
      <TextField prefix={prefix} name="scholarship_name" label="Scholarship name" maxLength={240} value={application?.scholarship_name ?? ""} />
      <TextField prefix={prefix} name="scholarship_link" label="Scholarship application link" type="url" maxLength={2048} value={application?.scholarship_link ?? ""} />
      <SelectField name="scholarship_status_id" label="Scholarship application status" defaultValue={application?.scholarship_status_id ?? ""} options={options("scholarship", application?.scholarship_status_id)} />
      <div className="space-y-3 sm:col-span-2">
        <CheckField name="enrollment_fee_paid" label="Enrollment fee paid" defaultChecked={application?.enrollment_fee_paid ?? false} />
        <CheckField name="admission_confirmed" label="Admission confirmed (needs an Approved decision)" defaultChecked={application?.admission_confirmed ?? false} />
      </div>
    </div>
    {!statuses.length ? <p className="text-sm text-muted-foreground">An admin can add application and scholarship labels in Settings. These fields can remain unset.</p> : null}
  </MutationForm>;
}
