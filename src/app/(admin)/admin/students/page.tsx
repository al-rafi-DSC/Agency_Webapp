import type { Metadata } from "next";
import Link from "next/link";
import { PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { StudentsExplorer } from "@/components/students/students-explorer";
import { getMockStaff, getMockStudents } from "@/lib/mock/students";

export const metadata: Metadata = { title: "Students" };

/**
 * ★ REFERENCE SCREEN — Admin students pipeline (PRD §6, flow 4).
 *
 * The shape every data screen should follow:
 *
 *   Server Component  →  fetch  →  pass typed props to a presentational component
 *
 * Right now the fetch is `getMockStudents()`. In Phase 3 that single line
 * becomes a Supabase query through `@/lib/supabase/server`, which runs as the
 * logged-in user so Row Level Security decides which rows come back. Nothing
 * below this line has to change — that is the point of keeping the components
 * presentational.
 *
 * `searchParams` is awaited (Next 16 hands it over as a Promise) purely so the
 * dashboard can deep-link into this screen with a filter pre-applied.
 */
export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ assignment?: string }>;
}) {
  const [students, staff, params] = await Promise.all([
    getMockStudents(),
    getMockStaff(),
    searchParams,
  ]);

  return (
    <>
      <PageHeader
        title="Students"
        description="Every student file, with the staff member assigned and current application status."
        actions={
          <Button
            nativeButton={false}
            render={
              <Link href="/admin/students/new">
                <PlusIcon />
                Open student file
              </Link>
            }
          />
        }
      />

      <StudentsExplorer
        students={students}
        staff={staff}
        showAssignedStaff
        studentBasePath="/admin/students"
        initialAssignment={params.assignment ?? "all"}
        createHref="/admin/students/new"
        emptyTitle="No student files opened yet"
        emptyDescription="Open the first student file to start tracking university applications."
      />
    </>
  );
}
