import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { ApplicationsExplorer } from "@/components/applications/applications-explorer";
import { getApplications } from "@/lib/supabase/workspace";

export const metadata: Metadata = { title: "Applications" };


export default async function AdminApplicationsPage() {
  const rows = await getApplications();

  return (
    <>
      <PageHeader
        title="Applications"
        description="One row per university. Application, decision and scholarship all move independently."
      />

      <ApplicationsExplorer
        rows={rows}
        showAssignedStaff
        studentBasePath="/admin/students"
      />
    </>
  );
}
