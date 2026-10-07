import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { UsersIcon, FileTextIcon, ClockIcon } from "lucide-react";
import { getWorker, getStudentsForWorker, getStaffWorkloadFor } from "@/lib/supabase/workspace";
import { saveWorkerAction, setWorkerRemovedAction } from "@/app/workspace/actions";
import { RemoveWorkerDialog } from "@/components/staff/remove-worker-dialog";
import { MutationForm } from "@/components/workspace/mutation-form";
import { formatDate } from "@/lib/format";
import { WorkerEditor } from "@/components/staff/worker-editor";
import { PageHeader } from "@/components/page-header";
import { StudentsTable } from "@/components/students/students-table";
import { StatTile } from "@/components/dashboard/stat-tile";
import { AttentionList } from "@/components/dashboard/attention-list";
import { Panel } from "@/components/panel";
import { needsAttention } from "@/lib/workspace/selectors";
import { requireRole } from "@/lib/auth/session";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  await requireRole(["admin", "superadmin"], { previewAs: "admin" });
  return { title: (await getWorker((await params).id))?.full_name ?? "Worker not found" };
}
export default async function WorkerPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["admin", "superadmin"], { previewAs: "admin" });
  const { id } = await params;
  const [worker, students, workload] = await Promise.all([getWorker(id), getStudentsForWorker(id), getStaffWorkloadFor(id)]);
  if (!worker) notFound();
  return <div className="space-y-5"><Link href="/admin/staff" className="text-sm underline">All workers</Link>
    <PageHeader title={worker.full_name}
      description={`${worker.email} · ${worker.removed_at ? "Removed" : worker.status === "inactive" ? "Inactive" : "Active"}`}
      actions={worker.removed_at ? undefined : <RemoveWorkerDialog action={setWorkerRemovedAction.bind(null, id, true)}
        workerName={worker.full_name} assignedCount={workload?.studentCount ?? 0} />} />
    {worker.removed_at ? <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-warning-soft p-4 text-warning-soft-foreground">
      <div className="space-y-1"><p className="text-sm font-medium">Removed {formatDate(worker.removed_at)}. This worker cannot sign in.</p>
        <p className="text-sm">Nothing was deleted. Restoring brings them back to the Workers list as Inactive; set them to Active below when they should sign in again.</p></div>
      <MutationForm action={setWorkerRemovedAction.bind(null, id, false)} submitLabel="Restore worker" variant="outline" size="sm" />
    </div> : null}
    <div className="grid gap-4 sm:grid-cols-3">
      <StatTile label="Assigned students" value={workload?.studentCount ?? 0} icon={UsersIcon} />
      <StatTile label="Applications" value={workload?.applicationCount ?? 0} icon={FileTextIcon} />
      <StatTile label="Awaiting decision" value={workload?.awaitingDecisionCount ?? 0} icon={ClockIcon} />
    </div>
    <WorkerEditor worker={worker} action={saveWorkerAction.bind(null, id)} />
    <Panel title="Needs attention"><AttentionList items={needsAttention(students)} /></Panel>
    <Panel title="Assigned students"><StudentsTable students={students} emptyMessage="No students assigned to this worker yet." /></Panel>
  </div>;
}
