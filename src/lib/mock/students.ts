/**
 * Mock fixtures for UI work.
 *
 * WHY THIS FILE EXISTS: screens are built against these fixtures, not against a
 * live database. That keeps UI generation (Builder.io Fusion) completely
 * separate from data access — no credentials in the Fusion sandbox, and no
 * chance of a generated screen inventing its own Supabase query and quietly
 * bypassing Row Level Security.
 *
 * Phase 3 replaces the `getMock*` calls in Server Components with real Supabase
 * queries. The function signatures are deliberately async so that swap is a
 * one-line change per screen and nothing above them has to be rewritten.
 *
 * This file is fake data only. Never import it from production data paths, and
 * never add a real network call here.
 */

import type {
  Staff,
  StudentWithApplications,
  UniversityApplication,
} from "@/types/db";

export const mockStaff: Staff[] = [
  {
    id: "staff-1",
    auth_user_id: "auth-staff-1",
    full_name: "Nadia Rahman",
    email: "nadia@example.com",
    role: "staff",
    avatar_url: null,
    created_at: "2026-07-02T09:00:00.000Z",
  },
  {
    id: "staff-2",
    auth_user_id: "auth-staff-2",
    full_name: "Omar Haque",
    email: "omar@example.com",
    role: "staff",
    avatar_url: null,
    created_at: "2026-07-14T09:00:00.000Z",
  },
  {
    id: "staff-3",
    auth_user_id: "auth-staff-3",
    full_name: "Priya Sen",
    email: "priya@example.com",
    role: "staff",
    avatar_url: null,
    created_at: "2026-08-01T09:00:00.000Z",
  },
];

function application(
  overrides: Partial<UniversityApplication> &
    Pick<UniversityApplication, "id" | "student_id" | "university_name">,
): UniversityApplication {
  return {
    application_link: null,
    application_status: "not_started",
    decision_status: "pending",
    admission_confirmed: false,
    scholarship_status: "not_applied",
    created_at: "2026-08-10T10:00:00.000Z",
    updated_at: "2026-08-28T10:00:00.000Z",
    ...overrides,
  };
}

export const mockStudents: StudentWithApplications[] = [
  {
    id: "student-1",
    full_name: "Ayesha Karim",
    photo_url: null,
    file_opened_at: "2026-06-18",
    assigned_staff_id: "staff-1",
    created_at: "2026-06-18T08:30:00.000Z",
    assigned_staff: { id: "staff-1", full_name: "Nadia Rahman", avatar_url: null },
    applications: [
      application({
        id: "app-1",
        student_id: "student-1",
        university_name: "University of Torino",
        application_link: "https://apply.unito.it/example",
        application_status: "submitted",
        decision_status: "accepted",
        admission_confirmed: true,
        scholarship_status: "awarded",
      }),
      application({
        id: "app-2",
        student_id: "student-1",
        university_name: "University of Bologna",
        application_status: "under_review",
        decision_status: "pending",
        scholarship_status: "applied",
      }),
    ],
  },
  {
    id: "student-2",
    full_name: "Tanvir Ahmed",
    photo_url: null,
    file_opened_at: "2026-07-05",
    assigned_staff_id: "staff-2",
    created_at: "2026-07-05T11:15:00.000Z",
    assigned_staff: { id: "staff-2", full_name: "Omar Haque", avatar_url: null },
    applications: [
      application({
        id: "app-3",
        student_id: "student-2",
        university_name: "TU Munich",
        application_status: "in_progress",
      }),
      application({
        id: "app-4",
        student_id: "student-2",
        university_name: "RWTH Aachen",
        application_status: "submitted",
        decision_status: "rejected",
        scholarship_status: "denied",
      }),
      application({
        id: "app-5",
        student_id: "student-2",
        university_name: "University of Stuttgart",
        application_status: "not_started",
      }),
    ],
  },
  {
    id: "student-3",
    full_name: "Fariha Noor",
    photo_url: null,
    file_opened_at: "2026-07-22",
    assigned_staff_id: "staff-1",
    created_at: "2026-07-22T14:40:00.000Z",
    assigned_staff: { id: "staff-1", full_name: "Nadia Rahman", avatar_url: null },
    applications: [
      application({
        id: "app-6",
        student_id: "student-3",
        university_name: "Politecnico di Milano",
        application_status: "submitted",
        decision_status: "accepted",
        admission_confirmed: false,
        scholarship_status: "applied",
      }),
    ],
  },
  {
    id: "student-4",
    full_name: "Rezwan Chowdhury",
    photo_url: null,
    file_opened_at: "2026-08-09",
    assigned_staff_id: null,
    created_at: "2026-08-09T09:05:00.000Z",
    assigned_staff: null,
    applications: [],
  },
  {
    id: "student-5",
    full_name: "Sumaiya Islam",
    photo_url: null,
    file_opened_at: "2026-08-27",
    assigned_staff_id: "staff-3",
    created_at: "2026-08-27T16:20:00.000Z",
    assigned_staff: { id: "staff-3", full_name: "Priya Sen", avatar_url: null },
    applications: [
      application({
        id: "app-7",
        student_id: "student-5",
        university_name: "University of Vienna",
        application_status: "in_progress",
        scholarship_status: "applied",
      }),
    ],
  },
];

/**
 * Admin view — every student, no scoping.
 * Phase 3: replace the body with a Supabase query. RLS returns all rows for an
 * admin, so the scoping lives in the database, not here.
 */
export async function getMockStudents(): Promise<StudentWithApplications[]> {
  return mockStudents;
}

/**
 * Staff view — only students assigned to this staff member.
 *
 * The filter below is for FIXTURES ONLY. In Phase 3 this becomes the same
 * unfiltered query as the admin view, because RLS does the scoping at the
 * database layer (PRD §7). Do not carry this client-side filter forward as if
 * it were the access control — it isn't.
 */
export async function getMockStudentsForStaff(
  staffId: string,
): Promise<StudentWithApplications[]> {
  return mockStudents.filter((student) => student.assigned_staff_id === staffId);
}

export async function getMockStudent(
  id: string,
): Promise<StudentWithApplications | null> {
  return mockStudents.find((student) => student.id === id) ?? null;
}
