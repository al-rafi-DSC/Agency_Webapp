import type { Metadata } from "next";
import Link from "next/link";
import { inviteStaffAction } from "@/app/(admin)/admin/staff/actions";
import { PageHeader } from "@/components/page-header";
import { InviteStaffDialog } from "@/components/staff/invite-staff-dialog";
import { StaffList } from "@/components/staff/staff-list";
import { getRemovedWorkers, getStaffWorkload } from "@/lib/supabase/workspace";
import { setWorkerRemovedAction } from "@/app/workspace/actions";
import { Panel } from "@/components/panel";
import { ArchivedList } from "@/components/workspace/archived-list";
import { MutationForm } from "@/components/workspace/mutation-form";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Workers" };
export default async function WorkersPage() {
  const [rows, removed] = await Promise.all([getStaffWorkload(), getRemovedWorkers()]);
  return <><PageHeader title="Workers" description="Worker accounts, employment details and assigned student files." actions={<InviteStaffDialog action={inviteStaffAction} />} />
    {/* The only link to /join. It is unlisted: the Admin copies this and sends it by hand. */}
    <p className="mb-4 text-sm text-muted-foreground">New worker? Send them the <Link href="/join" className="font-medium text-foreground underline underline-offset-4">staff details form</Link> link. It is not shown anywhere else; their details then appear on your dashboard.</p>
    <StaffList rows={rows} />
    {removed.length ? <Panel title="Removed workers" description="They cannot sign in. Nothing was deleted; restore a worker to bring them back as Inactive." className="mt-5">
      <ArchivedList items={removed.map((worker) => ({
        id: worker.id, label: worker.full_name, href: `/admin/staff/${worker.id}`,
        detail: `${worker.email} · Removed ${formatDate(worker.removed_at!)}`,
        action: <MutationForm action={setWorkerRemovedAction.bind(null, worker.id, false)} submitLabel="Restore" variant="outline" size="sm" />,
      }))} />
    </Panel> : null}</>;
}
