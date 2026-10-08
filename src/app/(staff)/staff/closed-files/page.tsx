import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { ClosedFilesList } from "@/components/students/closed-files-list";
import { getClosedStudents } from "@/lib/supabase/workspace";
import { requireSessionUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Closed files" };


export default async function StaffClosedFilesPage() {
  const [, files] = await Promise.all([
    requireSessionUser({ previewAs: "staff", next: "/staff/closed-files" }),
    getClosedStudents("staff"),
  ]);

  return (
    <>
      <PageHeader
        title="Closed files"
        description="Your students whose files are closed. They are read-only; only an admin can reopen one."
      />
      <ClosedFilesList
        files={files}
        studentBasePath="/staff/students"
        emptyDescription="When one of your student files is closed, it moves here."
      />
    </>
  );
}
