import type { Metadata } from "next";
import Link from "next/link";
import { PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { StudentsExplorer } from "@/components/students/students-explorer";
import { StudentsSummary } from "@/components/students/students-summary";
import { MainDriveLink } from "@/components/staff/main-drive-link";
import { getStudents, getWorker } from "@/lib/supabase/workspace";
import { requireSessionUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "My students" };


export default async function StaffStudentsPage() {
  const [user, students] = await Promise.all([
    requireSessionUser({ previewAs: "staff", next: "/staff/students" }),
    getStudents("staff"),
  ]);
  // RLS returns only this worker's own worker_details row.
  const worker = await getWorker(user.id);

  return (
    <>
      <PageHeader
        title="My students"
        description="Every student assigned to you, with where their applications stand."
        actions={
          <Button
            nativeButton={false}
            className="rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/30 hover:opacity-95"
            render={
              <Link href="/staff/students/new">
                <PlusIcon />
                Open student file
              </Link>
            }
          />
        }
      />

      <div className="mb-5">
        <MainDriveLink href={worker?.main_drive_link} />
      </div>

      <div className="mb-5">
        <StudentsSummary students={students} />
      </div>

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
