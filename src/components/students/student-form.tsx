import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/workspace/text-field";
import { CheckField, MutationForm } from "@/components/workspace/mutation-form";
import type { Staff } from "@/types/db";
import type { FormAction } from "@/types/workspace";

export function StudentForm({ staff, defaultFileOpenedAt, cancelHref, action }: {
  staff: Staff[]; defaultFileOpenedAt: string; cancelHref: string; action: FormAction;
}) {
  const active = staff.filter((w) => w.status !== "inactive");
  return <div className="space-y-4"><MutationForm action={action} submitLabel="Open student file" className="surface-panel p-5">
    <div className="grid gap-4 sm:grid-cols-2">
      <TextField name="full_name" label="Full name" required minLength={2} maxLength={200} />
      <TextField name="file_opened_at" label="File opened" type="date" required value={defaultFileOpenedAt} />
      <TextField name="email" label="Email" type="email" maxLength={320} />
      <TextField name="phone" label="Phone" type="tel" maxLength={80} />
    </div>
    <fieldset className="space-y-3"><legend className="mb-2 text-sm font-medium">Assign workers</legend>
      <p className="text-sm text-muted-foreground">Select any number of workers, or leave the file unassigned.</p>
      {active.length ? active.map((w) => <CheckField key={w.id} name="worker_ids" value={w.id} label={w.full_name} />) : <p className="text-sm text-muted-foreground">Invite a worker to start assigning files.</p>}
    </fieldset>
  </MutationForm><Button nativeButton={false} variant="outline" render={<Link href={cancelHref}>Cancel</Link>} /></div>;
}
