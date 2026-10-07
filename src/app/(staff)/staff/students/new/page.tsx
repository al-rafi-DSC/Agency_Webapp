import { createStudentAction } from "@/app/workspace/actions";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { StudentForm } from "@/components/students/student-form";
import { requireSessionUser } from "@/lib/auth/session";
import { getWorker, workspaceNow } from "@/lib/supabase/workspace";

export const metadata: Metadata = { title: "Open student file" };


export default async function StaffNewStudentPage() {
  const user = await requireSessionUser({ previewAs: "staff", next: "/staff/students/new" });
  // Admins pick the date, Drive link and worker on their own form.
  if (user.role === "admin" || user.role === "superadmin") redirect("/admin/students/new");
  const [now, worker] = await Promise.all([workspaceNow(), getWorker(user.id)]);
  const today = now.slice(0, 10);

  return (
    <>
      <Link
        href="/staff/students"
        className="mb-4 inline-flex w-fit items-center gap-1.5 rounded text-sm text-muted-foreground underline-offset-4 outline-none transition-colors hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <ArrowLeftIcon className="size-3.5" />
        My students
      </Link>

      <PageHeader
        title="Open a student file"
        description="Start tracking a new student. The file is assigned to you, and the Admin is notified."
      />

      <div className="max-w-2xl">
        <StudentForm action={createStudentAction}
          staff={[]}
          isAdmin={false}
          mainDriveLink={worker?.main_drive_link}
          defaultFileOpenedAt={today}
          cancelHref="/staff/students"
        />
      </div>
    </>
  );
}
