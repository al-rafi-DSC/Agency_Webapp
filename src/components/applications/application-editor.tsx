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
      <SelectField name="application_status_id" label="Application status" defaultValue={application?.application_status_id ?? ""} options={options("application", application?.application_status_id)} />
      <SelectField name="decision_status" label="University decision" defaultValue={application?.decision_status ?? DECISION_STATUSES[0]} options={DECISION_STATUSES.map((value) => ({ value, label: DECISION_STATUS_LABELS[value] }))} />
      <SelectField name="scholarship_status_id" label="Scholarship status" defaultValue={application?.scholarship_status_id ?? ""} options={options("scholarship", application?.scholarship_status_id)} />
      <CheckField name="admission_confirmed" label="Enrollment fee paid and admission confirmed" defaultChecked={application?.admission_confirmed ?? false} />
    </div>
    {!statuses.length ? <p className="text-sm text-muted-foreground">An admin can add application and scholarship labels in Settings. These fields can remain unset.</p> : null}
  </MutationForm>;
}
