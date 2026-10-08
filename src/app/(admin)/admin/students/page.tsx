import type { Metadata } from "next";
import Link from "next/link";
import { PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { StudentsExplorer } from "@/components/students/students-explorer";
import { StudentsSummary } from "@/components/students/students-summary";
import { ArchivedList } from "@/components/workspace/archived-list";
import { MutationForm } from "@/components/workspace/mutation-form";
import { getWorkers, getOpenStudents, getClosedStudents, getArchivedStudents } from "@/lib/supabase/workspace";
import { archiveRecordAction } from "@/app/workspace/actions";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Students" };


export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ assignment?: string }>;
}) {
  const [students, closed, staff, archived, params] = await Promise.all([
    getOpenStudents(),
    getClosedStudents(),
    getWorkers(),
    getArchivedStudents(),
    searchParams,
  ]);

  return (
    <>
      <PageHeader
        title="Students"
        description="Every open student file, with the workers assigned and current application status. Closed files are under Closed files."
        actions={
          <Button
            nativeButton={false}
            className="rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/30 hover:opacity-95"
            render={
              <Link href="/admin/students/new">
                <PlusIcon />
                Open student file
              </Link>
            }
          />
        }
      />

      <div className="mb-5">
        <StudentsSummary students={students} closedCount={closed.length} closedHref="/admin/closed-files" showUnassigned />
      </div>

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
