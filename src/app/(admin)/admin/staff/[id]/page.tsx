import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { UsersIcon, FileTextIcon, ClockIcon } from "lucide-react";
import { getWorker, getStudentsForWorker, getStaffWorkloadFor } from "@/lib/supabase/workspace";
import { saveWorkerAction } from "@/app/workspace/actions";
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
    <PageHeader title={worker.full_name} description={`${worker.email} · ${worker.status === "inactive" ? "Inactive" : "Active"}`} />
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
