import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { StudentForm } from "@/components/students/student-form";
import { MOCK_NOW, getMockStaff } from "@/lib/mock/students";

export const metadata: Metadata = { title: "Open student file" };

/**
 * Opening a student file (PRD §4.1 — Admin creates students).
 *
 * The date default is computed here, on the server, so the input does not
 * render differently depending on the viewer's timezone. In preview mode that
 * is the fixture clock; in Phase 3 it becomes the real one.
 */
export default async function NewStudentPage() {
  const staff = await getMockStaff();
  const today = MOCK_NOW.toISOString().slice(0, 10);

  return (
    <>
      <Link
        href="/admin/students"
        className="mb-4 inline-flex w-fit items-center gap-1.5 rounded text-sm text-muted-foreground underline-offset-4 outline-none transition-colors hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <ArrowLeftIcon className="size-3.5" />
        All students
      </Link>

      <PageHeader
        title="Open a student file"
        description="Start tracking a student. Universities are added to the file afterwards — one entry per application."
      />

      <div className="max-w-2xl">
        <StudentForm
          staff={staff}
          defaultFileOpenedAt={today}
          cancelHref="/admin/students"
        />
      </div>
    </>
  );
}
