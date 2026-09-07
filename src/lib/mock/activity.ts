/**
 * Activity and notes fixtures.
 *
 * ⚠ NOT A SCHEMA DECISION. `PRD.md` §5 defines Student, UniversityApplication
 * and Staff — it does not define an activity log or a notes table. These exist
 * so the timeline and dashboard feed have something to render, and so the shape
 * of the question ("do you want an audit trail? do you want notes?") is easy to
 * put in front of the owner. Do not write a migration from this file.
 *
 * Fake data only. No network call ever belongs here.
 */

import type { ActivityEvent, StudentNote } from "@/types/ui";

export const mockActivity: ActivityEvent[] = [
  {
    id: "act-1",
    kind: "decision_received",
    student_id: "student-11",
    student_name: "Rumana Akter",
    actor_name: "Imran Kabir",
    university_name: "Bocconi University",
    summary: "Offer received — admission not yet confirmed",
    occurred_at: "2026-09-05T10:00:00.000Z",
  },
  {
    id: "act-2",
    kind: "application_status_changed",
    student_id: "student-9",
    student_name: "Tasnia Haque",
    actor_name: "Priya Sen",
    university_name: "Uppsala University",
    summary: "Moved to under review",
    occurred_at: "2026-09-04T14:20:00.000Z",
  },
  {
    id: "act-3",
    kind: "decision_received",
    student_id: "student-3",
    student_name: "Fariha Noor",
    actor_name: "Nadia Rahman",
    university_name: "Politecnico di Milano",
    summary: "Offer received — admission not yet confirmed",
    occurred_at: "2026-09-03T09:15:00.000Z",
  },
  {
    id: "act-4",
    kind: "note_added",
    student_id: "student-5",
    student_name: "Sumaiya Islam",
    actor_name: "Priya Sen",
    university_name: null,
    summary: "Note added about outstanding transcript",
    occurred_at: "2026-09-02T16:40:00.000Z",
  },
  {
    id: "act-5",
    kind: "file_opened",
    student_id: "student-14",
    student_name: "Imtiaz Karim",
    actor_name: "Shafiqul Alam",
    university_name: null,
    summary: "Student file opened and assigned to Omar Haque",
    occurred_at: "2026-09-02T10:30:00.000Z",
  },
  {
    id: "act-6",
    kind: "admission_confirmed",
    student_id: "student-1",
    student_name: "Ayesha Karim",
    actor_name: "Nadia Rahman",
    university_name: "University of Torino",
    summary: "Enrollment fee recorded as paid, admission confirmed",
    occurred_at: "2026-09-01T11:05:00.000Z",
  },
  {
    id: "act-7",
    kind: "application_status_changed",
    student_id: "student-12",
    student_name: "Sabbir Alam",
    actor_name: "Lubna Zaman",
    university_name: "University of Oslo",
    summary: "Moved to under review",
    occurred_at: "2026-09-01T08:50:00.000Z",
  },
  {
    id: "act-8",
    kind: "application_added",
    student_id: "student-9",
    student_name: "Tasnia Haque",
    actor_name: "Priya Sen",
    university_name: "KTH Royal Institute of Technology",
    summary: "Application submitted",
    occurred_at: "2026-08-31T13:30:00.000Z",
  },
  {
    id: "act-9",
    kind: "scholarship_updated",
    student_id: "student-1",
    student_name: "Ayesha Karim",
    actor_name: "Nadia Rahman",
    university_name: "University of Bologna",
    summary: "Scholarship application submitted",
    occurred_at: "2026-08-30T15:10:00.000Z",
  },
  {
    id: "act-10",
    kind: "decision_received",
    student_id: "student-7",
    student_name: "Mahira Chowdhury",
    actor_name: "Imran Kabir",
    university_name: "TU Eindhoven",
    summary: "Offer received — admission not yet confirmed",
    occurred_at: "2026-08-29T10:00:00.000Z",
  },
  {
    id: "act-11",
    kind: "decision_received",
    student_id: "student-13",
    student_name: "Nusrat Jahan",
    actor_name: "Nadia Rahman",
    university_name: "University of British Columbia",
    summary: "Application rejected",
    occurred_at: "2026-08-27T12:00:00.000Z",
  },
  {
    id: "act-12",
    kind: "application_added",
    student_id: "student-10",
    student_name: "Arif Mahmud",
    actor_name: null,
    university_name: "University of Warsaw",
    summary: "Application created on an unassigned file",
    occurred_at: "2026-08-22T09:00:00.000Z",
  },
  {
    id: "act-13",
    kind: "file_opened",
    student_id: "student-10",
    student_name: "Arif Mahmud",
    actor_name: "Shafiqul Alam",
    university_name: null,
    summary: "Student file opened — no staff member assigned yet",
    occurred_at: "2026-08-21T15:30:00.000Z",
  },
  {
    id: "act-14",
    kind: "student_assigned",
    student_id: "student-8",
    student_name: "Zayan Rahim",
    actor_name: "Shafiqul Alam",
    university_name: null,
    summary: "Assigned to Lubna Zaman",
    occurred_at: "2026-08-02T12:05:00.000Z",
  },
];

export const mockNotes: StudentNote[] = [
  {
    id: "note-1",
    student_id: "student-1",
    author_name: "Nadia Rahman",
    body: "Torino admission confirmed. Visa appointment booked for the 24th — passport scan is on file, nothing outstanding from her side.",
    created_at: "2026-09-01T11:20:00.000Z",
  },
  {
    id: "note-2",
    student_id: "student-1",
    author_name: "Nadia Rahman",
    body: "Bologna asked for a certified translation of the transcript. Requested from the family, expected this week.",
    created_at: "2026-08-30T15:15:00.000Z",
  },
  {
    id: "note-3",
    student_id: "student-3",
    author_name: "Nadia Rahman",
    body: "PoliMi offer is in but the enrollment fee has not been paid. Deadline is tight — worth calling rather than emailing.",
    created_at: "2026-09-03T09:30:00.000Z",
  },
  {
    id: "note-4",
    student_id: "student-5",
    author_name: "Priya Sen",
    body: "Still waiting on the final semester transcript before the Vienna application can move past in-progress.",
    created_at: "2026-09-02T16:40:00.000Z",
  },
  {
    id: "note-5",
    student_id: "student-2",
    author_name: "Omar Haque",
    body: "Aachen came back rejected. Discussed refocusing effort on Munich and Stuttgart rather than adding more applications.",
    created_at: "2026-08-25T10:30:00.000Z",
  },
  {
    id: "note-6",
    student_id: "student-7",
    author_name: "Imran Kabir",
    body: "Two offers in hand. She is leaning toward Delft, which is already confirmed — Eindhoven can be declined once she is certain.",
    created_at: "2026-08-29T10:10:00.000Z",
  },
];

/** Most recent first. */
function byRecency(a: { occurred_at: string }, b: { occurred_at: string }) {
  return b.occurred_at.localeCompare(a.occurred_at);
}

export async function getMockActivity(limit?: number): Promise<ActivityEvent[]> {
  const sorted = [...mockActivity].sort(byRecency);
  return typeof limit === "number" ? sorted.slice(0, limit) : sorted;
}

export async function getMockActivityForStudent(
  studentId: string,
): Promise<ActivityEvent[]> {
  return mockActivity
    .filter((event) => event.student_id === studentId)
    .sort(byRecency);
}

/**
 * Activity for a set of students — the staff dashboard feed.
 *
 * Fixture-side filtering only. In Phase 3 the query is unfiltered and RLS
 * decides which rows a staff member can see (PRD §7).
 */
export async function getMockActivityForStudents(
  studentIds: string[],
  limit?: number,
): Promise<ActivityEvent[]> {
  const ids = new Set(studentIds);
  const sorted = mockActivity
    .filter((event) => ids.has(event.student_id))
    .sort(byRecency);
  return typeof limit === "number" ? sorted.slice(0, limit) : sorted;
}

export async function getMockNotesForStudent(
  studentId: string,
): Promise<StudentNote[]> {
  return mockNotes
    .filter((note) => note.student_id === studentId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}
