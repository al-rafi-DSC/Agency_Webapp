import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { ThemeToggle } from "@/components/theme-toggle";
import { TextField } from "@/components/workspace/text-field";
import { CheckField, MutationForm } from "@/components/workspace/mutation-form";
import { getWorkflowStatuses } from "@/lib/supabase/workspace";
import { requireRole } from "@/lib/auth/session";
import { addStatusAction, archiveStatusAction } from "@/app/workspace/actions";

export const metadata: Metadata = { title: "Settings" };
export default async function SettingsPage() {
  const user = await requireRole(["admin", "superadmin"], { previewAs: "admin" });
  const statuses = await getWorkflowStatuses();
  return <><PageHeader title="Settings" description="Account, appearance and your application workflow." /><div className="space-y-5">
    <Panel title="Account"><p className="text-sm">{user.full_name} · {user.email}</p></Panel>
    <Panel title="Appearance"><ThemeToggle /></Panel>
    {(["application", "scholarship"] as const).map((category) => <Panel key={category} title={category === "application" ? "Application statuses" : "Scholarship statuses"}>
      <div className="space-y-5">
        <p className="text-sm text-muted-foreground">Choose the wording your agency uses. Archived labels stay on existing applications and in report history.</p>
        {statuses.some((s) => s.category === category) ? <ul className="divide-y">{statuses.filter((s) => s.category === category).map((s) => <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div><p className="text-sm font-medium">{s.label}{s.archived ? " (archived)" : ""}</p><p className="text-xs text-muted-foreground">{s.counts_as_submitted ? "Counts as submitted" : s.counts_as_awarded ? "Counts as a scholarship award" : "Workflow stage"}</p></div>
          <MutationForm action={archiveStatusAction.bind(null, s.id, !s.archived)} submitLabel={s.archived ? "Restore status" : "Archive status"} />
        </li>)}</ul> : <p className="text-sm text-muted-foreground">No labels added yet. Applications can be saved with this status unset.</p>}
        <MutationForm action={addStatusAction} submitLabel={category === "application" ? "Add application status" : "Add scholarship status"}>
          <input type="hidden" name="category" value={category} />
          <TextField prefix={category} name="label" label="Status label" required maxLength={80} />
          {category === "application" ? <CheckField name="counts_as_submitted" label="This stage means the application has been submitted to the university" />
            : <CheckField name="counts_as_awarded" label="This stage means a scholarship has been awarded" />}
        </MutationForm>
      </div>
    </Panel>)}
  </div></>;
}
