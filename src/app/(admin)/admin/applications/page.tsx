import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { ApplicationsExplorer } from "@/components/applications/applications-explorer";
import { getMockApplications } from "@/lib/mock/selectors";

export const metadata: Metadata = { title: "Applications" };

/**
 * Every university application across every student (PRD §4.1).
 *
 * A student has many applications and each one moves independently (PRD §5.2),
 * so the pipeline view is per-application, not per-student. Rows link back to
 * the student file, which is where anything gets changed.
 */
export default async function AdminApplicationsPage() {
  const rows = await getMockApplications();

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
