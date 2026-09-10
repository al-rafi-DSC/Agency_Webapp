import type { Metadata } from "next";
import { inviteStaffAction } from "@/app/(admin)/admin/staff/actions";
import { PageHeader } from "@/components/page-header";
import { InviteStaffDialog } from "@/components/staff/invite-staff-dialog";
import { StaffList } from "@/components/staff/staff-list";
import { getStaffWorkload } from "@/lib/supabase/workspace";

export const metadata: Metadata = { title: "Workers" };
export default async function WorkersPage() {
  const rows = await getStaffWorkload();
  return <><PageHeader title="Workers" description="Worker accounts, employment details and assigned student files." actions={<InviteStaffDialog action={inviteStaffAction} />} />
    <StaffList rows={rows} /></>;
}
