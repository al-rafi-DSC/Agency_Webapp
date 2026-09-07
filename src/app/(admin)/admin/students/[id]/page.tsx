import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { StudentDetail } from "@/components/students/student-detail";
import { AssignStaffControl } from "@/components/students/assign-staff-control";
import {
  getMockActivityForStudent,
  getMockNotesForStudent,
} from "@/lib/mock/activity";
import { MOCK_NOW, getMockStaff, getMockStudent } from "@/lib/mock/students";

/**
 * Admin view of a single student file (PRD §4.1 — Admin sees every student).
 *
 * The route is `[id]`, so `params` arrives as a Promise under Next 16.
 *
 * In Phase 3 `getMockStudent(id)` becomes a Supabase query executed as the
 * signed-in user. A staff account hitting an Admin URL must come back empty
 * because RLS says so — `notFound()` here is a 404 for a missing row, not an
 * authorization check. Authorization lives in the database.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const student = await getMockStudent(id);

  return { title: student?.full_name ?? "Student not found" };
}

export default async function AdminStudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [student, staff, notes, activity] = await Promise.all([
    getMockStudent(id),
    getMockStaff(),
    getMockNotesForStudent(id),
    getMockActivityForStudent(id),
  ]);

  if (!student) notFound();

  return (
    <StudentDetail
      student={student}
      notes={notes}
      activity={activity}
      now={MOCK_NOW.toISOString()}
      backHref="/admin/students"
      backLabel="All students"
      buildStudentHref={(studentId) => `/admin/students/${studentId}`}
      assignSlot={
        <AssignStaffControl
          staff={staff}
          assignedStaffId={student.assigned_staff_id}
          studentName={student.full_name}
        />
      }
    />
  );
}
