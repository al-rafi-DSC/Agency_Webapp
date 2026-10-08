import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { ClosedFilesList } from "@/components/students/closed-files-list";
import { getClosedStudents } from "@/lib/supabase/workspace";

export const metadata: Metadata = { title: "Closed files" };


export default async function AdminClosedFilesPage() {
  const files = await getClosedStudents();

  return (
    <>
      <PageHeader
        title="Closed files"
        description="Student files closed by an admin or their worker. They are left out of dashboards and the Students list. Open one to reopen it."
      />
      <ClosedFilesList
        files={files}
        studentBasePath="/admin/students"
        showWorkerFilter
        emptyDescription="When a student file is closed, it moves here."
      />
    </>
  );
}
