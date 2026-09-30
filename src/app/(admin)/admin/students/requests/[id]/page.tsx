import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { acceptStudentSubmissionAction, dismissStudentSubmissionAction } from "@/app/workspace/actions";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { StudentForm } from "@/components/students/student-form";
import { StudentSubmissionAnswers } from "@/components/students/student-submission-answers";
import { MutationForm } from "@/components/workspace/mutation-form";
import { requireRole } from "@/lib/auth/session";
import { getStudentSubmissions, getWorkers, workspaceNow } from "@/lib/supabase/workspace";

export const metadata: Metadata = { title: "Student form" };

export default async function StudentSubmissionPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["admin", "superadmin"], { previewAs: "admin" });
  const { id } = await params;
  const [submissions, staff, now] = await Promise.all([getStudentSubmissions(), getWorkers(), workspaceNow()]);
  const submission = submissions.find((s) => s.id === id);
  // Only waiting forms have a page. Once one is dismissed there is nothing left
  // to show here; opening the file redirects to the new student instead.
  if (!submission) redirect("/admin");

  return (
    <div className="space-y-5">
      <Link href="/admin" className="text-sm underline">Dashboard</Link>
      <PageHeader
        title={submission.full_name || "New student form"}
        description="New student form — not a student file yet, and not assigned to anyone."
      />
      <StudentSubmissionAnswers submission={submission} />
      <Panel
        title="Open the student file and assign workers"
        description="Check the details picked out of the form. The answers above are saved on the file as its first note."
      >
        <div className="max-w-2xl">
          <StudentForm
            action={acceptStudentSubmissionAction.bind(null, submission.id)}
            staff={staff}
            defaultFileOpenedAt={now.slice(0, 10)}
            cancelHref="/admin"
            defaults={{ full_name: submission.full_name, email: submission.email, phone: submission.phone }}
          />
        </div>
      </Panel>
      <Panel title="Not a real student?" description="Dismissing removes the form from your dashboard. Nothing is deleted.">
        <MutationForm
          action={dismissStudentSubmissionAction.bind(null, submission.id)}
          submitLabel="Dismiss this form"
          variant="outline"
          size="sm"
        />
      </Panel>
    </div>
  );
}
