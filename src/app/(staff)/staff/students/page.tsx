import type { Metadata } from "next";
import Link from "next/link";
import { PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
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
        actions={
          <Button
            nativeButton={false}
            render={
              <Link href="/staff/students/new">
                <PlusIcon />
                Open student file
              </Link>
            }
          />
        }
      />

      <StudentsExplorer
        students={students}
        studentBasePath="/staff/students"
        createHref="/staff/students/new"
        emptyTitle="No students assigned to you yet"
        emptyDescription="Open a student file, or wait for the Admin to assign one to you."
      />
    </>
  );
}
