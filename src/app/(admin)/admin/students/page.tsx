import type { Metadata } from "next";
import Link from "next/link";
import { PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { StudentsExplorer } from "@/components/students/students-explorer";
import { ArchivedList } from "@/components/workspace/archived-list";
import { MutationForm } from "@/components/workspace/mutation-form";
import { getWorkers, getStudents, getArchivedStudents } from "@/lib/supabase/workspace";
import { archiveRecordAction } from "@/app/workspace/actions";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Students" };


export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ assignment?: string }>;
}) {
  const [students, staff, archived, params] = await Promise.all([
    getStudents(),
    getWorkers(),
    getArchivedStudents(),
    searchParams,
  ]);

  return (
    <>
      <PageHeader
        title="Students"
        description="Every student file, with the workers assigned and current application status."
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

      {archived.length ? (
        <Panel
          title="Archived student files"
          description="Hidden from staff, dashboards and new reports. Restore a file to make changes."
          className="mt-5"
        >
          <ArchivedList
            items={archived.map((student) => ({
              id: student.id,
              label: student.full_name,
              href: `/admin/students/${student.id}`,
              detail: student.archived_at ? `Archived ${formatDate(student.archived_at)}` : "Archived",
              action: (
                <MutationForm
                  action={archiveRecordAction.bind(null, "student", student.id, false)}
                  submitLabel="Restore"
                  variant="outline"
                  size="sm"
                />
              ),
            }))}
          />
        </Panel>
      ) : null}
    </>
  );
}
