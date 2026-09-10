import { TextField } from "@/components/workspace/text-field";
import { MutationForm, SelectField } from "@/components/workspace/mutation-form";
import type { Staff } from "@/types/db";
import type { FormAction } from "@/types/workspace";

export function WorkerEditor({ worker, action }: { worker: Staff; action: FormAction }) {
  return <MutationForm action={action} submitLabel="Save worker details" className="surface-panel p-5"><div className="grid gap-4 sm:grid-cols-2">
    <TextField name="full_name" label="Full name" required minLength={2} maxLength={200} value={worker.full_name} />
    <TextField name="phone" label="Phone" type="tel" maxLength={80} value={worker.phone ?? ""} />
    <TextField name="joined_on" label="Joined on" type="date" value={worker.joined_on ?? ""} />
    <TextField name="left_on" label="Left on" type="date" value={worker.left_on ?? ""} />
    <SelectField name="status" label="Account status" defaultValue={worker.status ?? "active"} options={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} />
  </div><p className="text-sm text-muted-foreground">Inactive workers lose workspace access. Their assignments stay available for manual reassignment.</p></MutationForm>;
}
