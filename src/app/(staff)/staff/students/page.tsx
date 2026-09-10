import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { StudentsExplorer } from "@/components/students/students-explorer";
import { getStudents } from "@/lib/supabase/workspace";

export const metadata: Metadata = { title: "My students" };


export default async function StaffStudentsPage() {
  const students = await getStudents("staff");

  return (
    <>
      <PageHeader
        title="My students"
        description="Every student assigned to you, with where their applications stand."
      />

      <StudentsExplorer
        students={students}
        studentBasePath="/staff/students"
        emptyTitle="No students assigned to you yet"
        emptyDescription="The Admin assigns student files. Once one is assigned it appears here."
      />
    </>
  );
}
