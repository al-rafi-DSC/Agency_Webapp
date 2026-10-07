import type { ReactNode } from "react";
import { AwardIcon, GraduationCapIcon, PlusIcon, ScaleIcon } from "lucide-react";

import { TextField } from "@/components/workspace/text-field";
import { CheckField, MutationForm, SelectField } from "@/components/workspace/mutation-form";
import { DecisionStatusBadge } from "@/components/students/status-badge";
import { DECISION_STATUSES, DECISION_STATUS_LABELS, type UniversityApplication } from "@/types/db";
import type { FormAction, WorkflowStatus } from "@/types/workspace";

/** A titled group of fields inside the application card. */
function Section({ icon: Icon, title, children }: { icon: typeof ScaleIcon; title: string; children: ReactNode }) {
  return <fieldset className="space-y-3 rounded-xl border bg-muted/30 p-4">
    <legend className="flex items-center gap-1.5 px-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
      <Icon className="size-3.5" aria-hidden />{title}
    </legend>
    <div className="grid gap-4 sm:grid-cols-2">{children}</div>
  </fieldset>;
}

export function ApplicationEditor({ application, statuses, action }: { application?: UniversityApplication; statuses: WorkflowStatus[]; action: FormAction }) {
  const prefix = application?.id ?? "new";
  const options = (category: WorkflowStatus["category"], selected?: string | null) => [{ value: "", label: "Not set" },
    ...statuses.filter((s) => s.category === category && (!s.archived || s.id === selected)).map((s) => ({ value: s.id, label: s.label + (s.archived ? " (archived)" : "") }))];
  return <MutationForm action={action} submitLabel={application ? "Save application" : "Add university application"}
    className={application ? "surface-panel p-5" : "surface-panel border-dashed border-primary/40 p-5"}>
    <div className="flex flex-wrap items-center gap-3">
      <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-md shadow-violet-500/30">
        {application ? <GraduationCapIcon className="size-5" /> : <PlusIcon className="size-5" />}
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="text-base font-semibold break-words">{application ? application.university_name : "Add a university"}</h3>
        <p className="text-xs text-muted-foreground">{application ? "Application, decision and scholarship for this university." : "Each university gets its own application, decision and scholarship."}</p>
      </div>
      {application ? <DecisionStatusBadge status={application.decision_status} /> : null}
    </div>

    <Section icon={GraduationCapIcon} title="Application">
      <TextField prefix={prefix} name="university_name" label="University" required minLength={2} value={application?.university_name ?? ""} />
      <TextField prefix={prefix} name="application_link" label="Application link" type="url" maxLength={2048} value={application?.application_link ?? ""} />
      <TextField prefix={prefix} name="preferred_subject" label="Preferred subject" maxLength={200} value={application?.preferred_subject ?? ""} />
      <SelectField name="application_status_id" label="Application status" defaultValue={application?.application_status_id ?? ""} options={options("application", application?.application_status_id)} />
      <TextField prefix={prefix} name="entrance_exam" label="Entrance exam" maxLength={200} value={application?.entrance_exam ?? ""} />
      <TextField prefix={prefix} name="entrance_exam_date" label="Entrance exam booked on" type="date" value={application?.entrance_exam_date ?? ""} />
    </Section>

    <Section icon={ScaleIcon} title="Decision & enrollment">
      <SelectField name="decision_status" label="University decision" defaultValue={application?.decision_status ?? DECISION_STATUSES[0]} options={DECISION_STATUSES.map((value) => ({ value, label: DECISION_STATUS_LABELS[value] }))} />
      <div className="space-y-3 sm:pt-7">
        <CheckField name="enrollment_fee_paid" label="Enrollment fee paid" defaultChecked={application?.enrollment_fee_paid ?? false} />
        <CheckField name="admission_confirmed" label="Admission confirmed (needs an Approved decision)" defaultChecked={application?.admission_confirmed ?? false} />
      </div>
    </Section>

    <Section icon={AwardIcon} title="Scholarship">
      <TextField prefix={prefix} name="scholarship_name" label="Scholarship name" maxLength={240} value={application?.scholarship_name ?? ""} />
      <SelectField name="scholarship_status_id" label="Scholarship application status" defaultValue={application?.scholarship_status_id ?? ""} options={options("scholarship", application?.scholarship_status_id)} />
      <div className="sm:col-span-2">
        <TextField prefix={prefix} name="scholarship_link" label="Scholarship application link" type="url" maxLength={2048} value={application?.scholarship_link ?? ""} />
      </div>
    </Section>
    {!statuses.length ? <p className="text-sm text-muted-foreground">An admin can add application and scholarship labels in Settings. These fields can remain unset.</p> : null}
  </MutationForm>;
}
