import type { Metadata } from "next";
import Link from "next/link";
import { inviteStaffAction } from "@/app/(admin)/admin/staff/actions";
import { PageHeader } from "@/components/page-header";
import { InviteStaffDialog } from "@/components/staff/invite-staff-dialog";
import { StaffList } from "@/components/staff/staff-list";
import { getStaffWorkload } from "@/lib/supabase/workspace";

export const metadata: Metadata = { title: "Workers" };
export default async function WorkersPage() {
  const rows = await getStaffWorkload();
  return <><PageHeader title="Workers" description="Worker accounts, employment details and assigned student files." actions={<InviteStaffDialog action={inviteStaffAction} />} />
    {/* The only link to /join. It is unlisted: the Admin copies this and sends it by hand. */}
    <p className="mb-4 text-sm text-muted-foreground">New worker? Send them the <Link href="/join" className="font-medium text-foreground underline underline-offset-4">staff details form</Link> link. It is not shown anywhere else; their details then appear on your dashboard.</p>
    <StaffList rows={rows} /></>;
}
