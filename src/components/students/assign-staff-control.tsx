import { CheckField, MutationForm } from "@/components/workspace/mutation-form";
import type { Staff } from "@/types/db";
import type { FormAction } from "@/types/workspace";

export function AssignStaffControl({ staff, assignedWorkerIds, action }: { staff: Staff[]; assignedWorkerIds: string[]; action: FormAction }) {
  return <MutationForm action={action} submitLabel="Save assignments">
    {staff.length ? staff.map((w) => w.status === "inactive"
      ? assignedWorkerIds.includes(w.id) ? <p key={w.id} className="text-sm text-warning-soft-foreground">{w.full_name} is inactive. Saving removes their current assignment.</p> : null
      : <CheckField key={w.id} name="worker_ids" value={w.id} label={w.full_name} defaultChecked={assignedWorkerIds.includes(w.id)} />)
      : <p className="text-sm text-muted-foreground">No workers have been invited yet.</p>}
  </MutationForm>;
}
