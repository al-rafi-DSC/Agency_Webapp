/**
 * Mock fixtures for UI work.
 *
 * WHY THIS FILE EXISTS: screens are built against these fixtures, not against a
 * live database. That keeps UI work completely separate from data access — no
 * credentials needed to build a screen, and no chance of a screen inventing its
 * own Supabase query and quietly bypassing Row Level Security.
 *
 * Phase 3 replaces the `getMock*` calls in Server Components with real Supabase
 * queries. The function signatures are deliberately async so that swap is a
 * one-line change per screen and nothing above them has to be rewritten.
 *
 * This file is fake data only. Never import it from production data paths, and
 * never add a real network call here.
 *
 * ── Coverage ─────────────────────────────────────────────────────────────────
 * The fixture set deliberately includes the awkward cases, so no UI state ships
 * unexercised: an unassigned student, an unassigned student who already has an
 * application, students with no applications at all, an accepted offer whose
 * admission is still unconfirmed, a fully rejected file, and a student with
 * four parallel applications.
 */

import type {
  Staff,
  StudentWithApplications,
  UniversityApplication,
} from "@/types/db";
import type { SessionUser } from "@/types/ui";

/**
 * Fixed "now" for the fixtures.
 *
 * Everything derived from elapsed time (a stalled application, a relative
 * timestamp) measures against this, not `Date.now()`. Two reasons: the demo
 * data stays meaningful next month, and a server render and a client render
 * cannot disagree about the current time and blow up hydration.
 *
 * Phase 3: this constant disappears with the fixtures.
 */
export const MOCK_NOW = new Date("2026-09-07T09:00:00.000Z");

/** Admin is the agency owner — full visibility (PRD §4.1). */
export const mockAdmin: Staff = {
  id: "admin-1",
  auth_user_id: "auth-admin-1",
  full_name: "Shafiqul Alam",
  email: "owner@example.com",
  role: "admin",
  avatar_url: null,
  created_at: "2026-06-01T09:00:00.000Z",
};

/** Staff are an equal tier — no seniority between them (PRD §4.2). */
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
  {
    id: "staff-4",
    auth_user_id: "auth-staff-4",
    full_name: "Imran Kabir",
    email: "imran@example.com",
    role: "staff",
    avatar_url: null,
    created_at: "2026-08-05T09:00:00.000Z",
  },
  {
    id: "staff-5",
    auth_user_id: "auth-staff-5",
    full_name: "Lubna Zaman",
    email: "lubna@example.com",
    role: "staff",
    avatar_url: null,
    created_at: "2026-08-19T09:00:00.000Z",
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

function staffRef(id: string) {
  const match = mockStaff.find((member) => member.id === id);
  if (!match) {
    throw new Error(`Fixture error: no staff member with id "${id}".`);
  }
  return {
    id: match.id,
    full_name: match.full_name,
    avatar_url: match.avatar_url,
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
    assigned_staff: staffRef("staff-1"),
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
        created_at: "2026-06-20T10:00:00.000Z",
        updated_at: "2026-09-01T10:00:00.000Z",
      }),
      application({
        id: "app-2",
        student_id: "student-1",
        university_name: "University of Bologna",
        application_link: "https://apply.unibo.it/example",
        application_status: "under_review",
        decision_status: "pending",
        scholarship_status: "applied",
        created_at: "2026-07-01T10:00:00.000Z",
        updated_at: "2026-08-30T10:00:00.000Z",
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
    assigned_staff: staffRef("staff-2"),
    applications: [
      application({
        id: "app-3",
        student_id: "student-2",
        university_name: "TU Munich",
        application_status: "in_progress",
        created_at: "2026-07-08T10:00:00.000Z",
        updated_at: "2026-07-12T10:00:00.000Z",
      }),
      application({
        id: "app-4",
        student_id: "student-2",
        university_name: "RWTH Aachen",
        application_link: "https://apply.rwth-aachen.de/example",
        application_status: "submitted",
        decision_status: "rejected",
        scholarship_status: "denied",
        created_at: "2026-07-08T10:00:00.000Z",
        updated_at: "2026-08-25T10:00:00.000Z",
      }),
      application({
        id: "app-5",
        student_id: "student-2",
        university_name: "University of Stuttgart",
        application_status: "not_started",
        created_at: "2026-07-20T10:00:00.000Z",
        updated_at: "2026-07-20T10:00:00.000Z",
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
    assigned_staff: staffRef("staff-1"),
    applications: [
      application({
        id: "app-6",
        student_id: "student-3",
        university_name: "Politecnico di Milano",
        application_link: "https://apply.polimi.it/example",
        application_status: "submitted",
        decision_status: "accepted",
        // Accepted but not yet confirmed — this is what the attention queue
        // is for. An offer can lapse while nobody is watching it.
        admission_confirmed: false,
        scholarship_status: "applied",
        created_at: "2026-07-25T10:00:00.000Z",
        updated_at: "2026-09-03T10:00:00.000Z",
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
    assigned_staff: staffRef("staff-3"),
    applications: [
      application({
        id: "app-7",
        student_id: "student-5",
        university_name: "University of Vienna",
        application_status: "in_progress",
        scholarship_status: "applied",
        created_at: "2026-08-28T10:00:00.000Z",
        updated_at: "2026-09-02T10:00:00.000Z",
      }),
    ],
  },
  {
    id: "student-6",
    full_name: "Nabil Hasan",
    photo_url: null,
    file_opened_at: "2026-05-14",
    assigned_staff_id: "staff-2",
    created_at: "2026-05-14T10:10:00.000Z",
    assigned_staff: staffRef("staff-2"),
    applications: [
      application({
        id: "app-8",
        student_id: "student-6",
        university_name: "University of Padova",
        application_link: "https://apply.unipd.it/example",
        application_status: "submitted",
        decision_status: "pending",
        created_at: "2026-05-20T10:00:00.000Z",
        updated_at: "2026-08-18T10:00:00.000Z",
      }),
      application({
        id: "app-9",
        student_id: "student-6",
        university_name: "Ca' Foscari Venice",
        application_status: "under_review",
        decision_status: "pending",
        scholarship_status: "applied",
        created_at: "2026-06-02T10:00:00.000Z",
        updated_at: "2026-08-21T10:00:00.000Z",
      }),
    ],
  },
  {
    id: "student-7",
    full_name: "Mahira Chowdhury",
    photo_url: null,
    file_opened_at: "2026-04-30",
    assigned_staff_id: "staff-4",
    created_at: "2026-04-30T08:00:00.000Z",
    assigned_staff: staffRef("staff-4"),
    applications: [
      application({
        id: "app-10",
        student_id: "student-7",
        university_name: "TU Delft",
        application_link: "https://apply.tudelft.nl/example",
        application_status: "submitted",
        decision_status: "accepted",
        admission_confirmed: true,
        scholarship_status: "awarded",
        created_at: "2026-05-04T10:00:00.000Z",
        updated_at: "2026-08-14T10:00:00.000Z",
      }),
      application({
        id: "app-11",
        student_id: "student-7",
        university_name: "TU Eindhoven",
        application_status: "submitted",
        decision_status: "accepted",
        admission_confirmed: false,
        scholarship_status: "applied",
        created_at: "2026-05-04T10:00:00.000Z",
        updated_at: "2026-08-29T10:00:00.000Z",
      }),
      application({
        id: "app-12",
        student_id: "student-7",
        university_name: "University of Groningen",
        application_status: "submitted",
        decision_status: "rejected",
        scholarship_status: "denied",
        created_at: "2026-05-10T10:00:00.000Z",
        updated_at: "2026-07-30T10:00:00.000Z",
      }),
    ],
  },
  {
    id: "student-8",
    full_name: "Zayan Rahim",
    photo_url: null,
    file_opened_at: "2026-08-02",
    assigned_staff_id: "staff-5",
    created_at: "2026-08-02T12:00:00.000Z",
    assigned_staff: staffRef("staff-5"),
    applications: [
      application({
        id: "app-13",
        student_id: "student-8",
        university_name: "Lund University",
        application_status: "not_started",
        created_at: "2026-08-04T10:00:00.000Z",
        // Untouched for over a month — stalled.
        updated_at: "2026-08-04T10:00:00.000Z",
      }),
    ],
  },
  {
    id: "student-9",
    full_name: "Tasnia Haque",
    photo_url: null,
    file_opened_at: "2026-06-06",
    assigned_staff_id: "staff-3",
    created_at: "2026-06-06T09:45:00.000Z",
    assigned_staff: staffRef("staff-3"),
    applications: [
      application({
        id: "app-14",
        student_id: "student-9",
        university_name: "Uppsala University",
        application_status: "under_review",
        decision_status: "pending",
        scholarship_status: "applied",
        created_at: "2026-06-12T10:00:00.000Z",
        updated_at: "2026-09-04T10:00:00.000Z",
      }),
      application({
        id: "app-15",
        student_id: "student-9",
        university_name: "KTH Royal Institute of Technology",
        application_link: "https://apply.kth.se/example",
        application_status: "submitted",
        decision_status: "pending",
        scholarship_status: "applied",
        created_at: "2026-06-12T10:00:00.000Z",
        updated_at: "2026-08-31T10:00:00.000Z",
      }),
    ],
  },
  {
    id: "student-10",
    full_name: "Arif Mahmud",
    photo_url: null,
    file_opened_at: "2026-08-21",
    // Unassigned AND already applying — nobody owns this file.
    assigned_staff_id: null,
    created_at: "2026-08-21T15:30:00.000Z",
    assigned_staff: null,
    applications: [
      application({
        id: "app-16",
        student_id: "student-10",
        university_name: "University of Warsaw",
        application_status: "not_started",
        created_at: "2026-08-22T10:00:00.000Z",
        updated_at: "2026-08-22T10:00:00.000Z",
      }),
    ],
  },
  {
    id: "student-11",
    full_name: "Rumana Akter",
    photo_url: null,
    file_opened_at: "2026-05-28",
    assigned_staff_id: "staff-4",
    created_at: "2026-05-28T11:00:00.000Z",
    assigned_staff: staffRef("staff-4"),
    applications: [
      application({
        id: "app-17",
        student_id: "student-11",
        university_name: "Bocconi University",
        application_link: "https://apply.unibocconi.it/example",
        application_status: "submitted",
        decision_status: "accepted",
        admission_confirmed: false,
        scholarship_status: "awarded",
        created_at: "2026-06-01T10:00:00.000Z",
        updated_at: "2026-09-05T10:00:00.000Z",
      }),
      application({
        id: "app-18",
        student_id: "student-11",
        university_name: "Sapienza University of Rome",
        application_status: "under_review",
        decision_status: "pending",
        scholarship_status: "applied",
        created_at: "2026-06-01T10:00:00.000Z",
        updated_at: "2026-08-26T10:00:00.000Z",
      }),
    ],
  },
  {
    id: "student-12",
    full_name: "Sabbir Alam",
    photo_url: null,
    file_opened_at: "2026-04-12",
    assigned_staff_id: "staff-5",
    created_at: "2026-04-12T08:20:00.000Z",
    assigned_staff: staffRef("staff-5"),
    applications: [
      application({
        id: "app-19",
        student_id: "student-12",
        university_name: "University of Helsinki",
        application_status: "submitted",
        decision_status: "accepted",
        admission_confirmed: true,
        scholarship_status: "applied",
        created_at: "2026-04-20T10:00:00.000Z",
        updated_at: "2026-08-12T10:00:00.000Z",
      }),
      application({
        id: "app-20",
        student_id: "student-12",
        university_name: "Aalto University",
        application_status: "submitted",
        decision_status: "rejected",
        scholarship_status: "denied",
        created_at: "2026-04-20T10:00:00.000Z",
        updated_at: "2026-07-18T10:00:00.000Z",
      }),
      application({
        id: "app-21",
        student_id: "student-12",
        university_name: "University of Oslo",
        application_status: "under_review",
        decision_status: "pending",
        scholarship_status: "applied",
        created_at: "2026-05-06T10:00:00.000Z",
        updated_at: "2026-09-01T10:00:00.000Z",
      }),
      application({
        id: "app-22",
        student_id: "student-12",
        university_name: "Norwegian University of Science and Technology",
        application_status: "in_progress",
        created_at: "2026-06-15T10:00:00.000Z",
        // Sitting in progress since June — stalled.
        updated_at: "2026-06-28T10:00:00.000Z",
      }),
    ],
  },
  {
    id: "student-13",
    full_name: "Nusrat Jahan",
    photo_url: null,
    file_opened_at: "2026-07-11",
    assigned_staff_id: "staff-1",
    created_at: "2026-07-11T13:00:00.000Z",
    assigned_staff: staffRef("staff-1"),
    applications: [
      application({
        id: "app-23",
        student_id: "student-13",
        university_name: "University of British Columbia",
        application_status: "submitted",
        decision_status: "rejected",
        scholarship_status: "denied",
        created_at: "2026-07-15T10:00:00.000Z",
        updated_at: "2026-08-27T10:00:00.000Z",
      }),
    ],
  },
  {
    id: "student-14",
    full_name: "Imtiaz Karim",
    photo_url: null,
    file_opened_at: "2026-09-02",
    assigned_staff_id: "staff-2",
    created_at: "2026-09-02T10:30:00.000Z",
    assigned_staff: staffRef("staff-2"),
    applications: [],
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

export async function getMockStaff(): Promise<Staff[]> {
  return mockStaff;
}

export async function getMockStaffMember(id: string): Promise<Staff | null> {
  return mockStaff.find((member) => member.id === id) ?? null;
}

/**
 * The signed-in user the shell renders.
 *
 * Phase 3: this comes from the Supabase session plus the user's profile row.
 * Until then each route group hard-codes which fixture identity it is browsing
 * as — that is a preview convenience, not a login.
 */
export async function getMockSessionUser(
  role: "admin" | "staff",
): Promise<SessionUser> {
  const source = role === "admin" ? mockAdmin : mockStaff[0];
  return {
    id: source.id,
    full_name: source.full_name,
    email: source.email,
    role: source.role,
    avatar_url: source.avatar_url,
  };
}

/** The fixture identity the staff route group browses as. */
export const MOCK_CURRENT_STAFF_ID = "staff-1";
