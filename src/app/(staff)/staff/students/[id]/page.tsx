import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { StudentDetail } from "@/components/students/student-detail";
import {
  getMockActivityForStudent,
  getMockNotesForStudent,
} from "@/lib/mock/activity";
import {
  MOCK_CURRENT_STAFF_ID,
  MOCK_NOW,
  getMockStudent,
} from "@/lib/mock/students";

/**
 * Staff view of a student file — the same screen as the Admin one, without the
 * reassign control (PRD §4.2: staff do not assign students).
 *
 * ── The fixture check below is NOT the access control ────────────────────────
 * Comparing `assigned_staff_id` to the preview identity keeps the mock data
 * honest so the screen behaves the way the real one will. It is an `if` in
 * application code, and an `if` in application code is not security. In Phase 3
 * the query runs as the signed-in user and Row Level Security returns nothing
 * for a student this account is not assigned to — which is why this file can be
 * deleted, rewritten or bypassed without opening a hole.
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

export default async function StaffStudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [student, notes, activity] = await Promise.all([
    getMockStudent(id),
    getMockNotesForStudent(id),
    getMockActivityForStudent(id),
  ]);

  if (!student || student.assigned_staff_id !== MOCK_CURRENT_STAFF_ID) {
    notFound();
  }

  return (
    <StudentDetail
      student={student}
      notes={notes}
      activity={activity}
      now={MOCK_NOW.toISOString()}
      backHref="/staff/students"
      backLabel="My students"
      buildStudentHref={(studentId) => `/staff/students/${studentId}`}
    />
  );
}
