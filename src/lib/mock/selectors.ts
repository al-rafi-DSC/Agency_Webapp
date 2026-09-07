/**
 * Derived read models over the fixtures.
 *
 * Pages call these instead of computing aggregates inline, so a Server
 * Component stays one fetch and a hand-off of typed props, and the components
 * below it stay presentational.
 *
 * Every function here is a pure roll-up of the fixture arrays — no I/O. In
 * Phase 3 each one becomes a Supabase query (or a view), and the `async`
 * signature means callers do not change.
 *
 * ⚠ The thresholds below (what counts as "stalled", what counts as "needs
 * attention") are UI heuristics chosen to make the queue useful, NOT confirmed
 * product rules. `PRD.md` §10 does not define them. Surface them to the owner
 * before treating any of them as policy.
 */

import {
  APPLICATION_STATUSES,
  DECISION_STATUSES,
  SCHOLARSHIP_STATUSES,
  type ApplicationStatus,
  type DecisionStatus,
  type ScholarshipStatus,
  type Staff,
  type StudentWithApplications,
} from "@/types/db";
import type {
  ApplicationRow,
  AttentionItem,
  DashboardStats,
  SearchEntry,
  StaffWorkload,
  StatusBreakdown,
} from "@/types/ui";

import {
  MOCK_NOW,
  getMockStudents,
  getMockStudentsForStaff,
  mockStaff,
  mockStudents,
} from "@/lib/mock/students";

/** ⚠ UI heuristic, not a confirmed product rule — see file header. */
const STALL_THRESHOLD_DAYS = 30;
/** ⚠ UI heuristic, not a confirmed product rule — see file header. */
const NO_APPLICATION_THRESHOLD_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1000;

function daysSince(iso: string) {
  return Math.floor((MOCK_NOW.getTime() - new Date(iso).getTime()) / DAY_MS);
}

function emptyBreakdown(): StatusBreakdown {
  return {
    application: Object.fromEntries(
      APPLICATION_STATUSES.map((status) => [status, 0]),
    ) as Record<ApplicationStatus, number>,
    decision: Object.fromEntries(
      DECISION_STATUSES.map((status) => [status, 0]),
    ) as Record<DecisionStatus, number>,
    scholarship: Object.fromEntries(
      SCHOLARSHIP_STATUSES.map((status) => [status, 0]),
    ) as Record<ScholarshipStatus, number>,
  };
}

/**
 * "Active" = submitted or under review — sent, and waiting on the university.
 * Deliberately excludes not-started and in-progress, which are waiting on us.
 */
function isActive(status: ApplicationStatus) {
  return status === "submitted" || status === "under_review";
}

export function computeDashboardStats(
  students: StudentWithApplications[],
): DashboardStats {
  const breakdown = emptyBreakdown();

  let totalApplications = 0;
  let activeApplications = 0;
  let acceptedCount = 0;
  let rejectedCount = 0;
  let admissionsConfirmed = 0;
  let scholarshipsAwarded = 0;

  for (const student of students) {
    for (const app of student.applications) {
      totalApplications += 1;
      breakdown.application[app.application_status] += 1;
      breakdown.decision[app.decision_status] += 1;
      breakdown.scholarship[app.scholarship_status] += 1;

      if (isActive(app.application_status)) activeApplications += 1;
      if (app.decision_status === "accepted") acceptedCount += 1;
      if (app.decision_status === "rejected") rejectedCount += 1;
      if (app.admission_confirmed) admissionsConfirmed += 1;
      if (app.scholarship_status === "awarded") scholarshipsAwarded += 1;
    }
  }

  return {
    totalStudents: students.length,
    unassignedStudents: students.filter((s) => s.assigned_staff_id === null)
      .length,
    studentsWithoutApplications: students.filter(
      (s) => s.applications.length === 0,
    ).length,
    totalApplications,
    activeApplications,
    acceptedCount,
    rejectedCount,
    admissionsConfirmed,
    scholarshipsAwarded,
    breakdown,
  };
}

export async function getMockDashboardStats(): Promise<DashboardStats> {
  return computeDashboardStats(await getMockStudents());
}

export async function getMockDashboardStatsForStaff(
  staffId: string,
): Promise<DashboardStats> {
  return computeDashboardStats(await getMockStudentsForStaff(staffId));
}

/**
 * Caseload per staff member.
 *
 * `loadRatio` is relative to the busiest staff member, so the meters compare
 * against each other rather than against an invented capacity — the agency has
 * not defined one, and inventing a "max caseload" would be inventing policy.
 */
export async function getMockStaffWorkload(): Promise<StaffWorkload[]> {
  const rows = mockStaff.map((staff: Staff) => {
    const assigned = mockStudents.filter(
      (student) => student.assigned_staff_id === staff.id,
    );
    const applications = assigned.flatMap((student) => student.applications);

    return {
      staff,
      studentCount: assigned.length,
      applicationCount: applications.length,
      acceptedCount: applications.filter(
        (app) => app.decision_status === "accepted",
      ).length,
      awaitingDecisionCount: applications.filter(
        (app) => app.decision_status === "pending" && isActive(app.application_status),
      ).length,
      loadRatio: 0,
    };
  });

  const busiest = Math.max(1, ...rows.map((row) => row.studentCount));
  return rows
    .map((row) => ({ ...row, loadRatio: row.studentCount / busiest }))
    .sort((a, b) => b.studentCount - a.studentCount);
}

export async function getMockStaffWorkloadFor(
  staffId: string,
): Promise<StaffWorkload | null> {
  const all = await getMockStaffWorkload();
  return all.find((row) => row.staff.id === staffId) ?? null;
}

function toApplicationRows(
  students: StudentWithApplications[],
): ApplicationRow[] {
  return students
    .flatMap((student) =>
      student.applications.map((app) => ({
        ...app,
        student: { id: student.id, full_name: student.full_name },
        assigned_staff: student.assigned_staff
          ? {
              id: student.assigned_staff.id,
              full_name: student.assigned_staff.full_name,
            }
          : null,
      })),
    )
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export async function getMockApplications(): Promise<ApplicationRow[]> {
  return toApplicationRows(await getMockStudents());
}

export async function getMockApplicationsForStaff(
  staffId: string,
): Promise<ApplicationRow[]> {
  return toApplicationRows(await getMockStudentsForStaff(staffId));
}

/**
 * The "needs attention" queue.
 *
 * Three heuristics, in severity order:
 *   1. An offer accepted but not confirmed — an offer can lapse unwatched.
 *   2. A student file with nobody assigned to it.
 *   3. An application that has not moved in a month, or a file with no
 *      applications two weeks after it was opened.
 *
 * ⚠ These thresholds are not product policy — see the file header. Nothing acts
 * on this list automatically; it is a prompt for a human to look.
 */
export function computeNeedsAttention(
  students: StudentWithApplications[],
): AttentionItem[] {
  const items: AttentionItem[] = [];

  for (const student of students) {
    for (const app of student.applications) {
      if (app.decision_status === "accepted" && !app.admission_confirmed) {
        items.push({
          id: `attention-offer-${app.id}`,
          severity: "high",
          student_id: student.id,
          student_name: student.full_name,
          university_name: app.university_name,
          reason: "Offer not confirmed",
          detail:
            "Accepted, but the enrollment fee and admission are still unconfirmed.",
        });
      }
    }

    if (student.assigned_staff_id === null) {
      items.push({
        id: `attention-unassigned-${student.id}`,
        severity: "high",
        student_id: student.id,
        student_name: student.full_name,
        university_name: null,
        reason: "No staff assigned",
        detail:
          student.applications.length > 0
            ? "This file already has applications and nobody is responsible for it."
            : "Opened but never assigned to a staff member.",
      });
    }

    for (const app of student.applications) {
      const idle = daysSince(app.updated_at);
      if (!isActive(app.application_status) && idle >= STALL_THRESHOLD_DAYS) {
        items.push({
          id: `attention-stalled-${app.id}`,
          severity: "medium",
          student_id: student.id,
          student_name: student.full_name,
          university_name: app.university_name,
          reason: "Application stalled",
          detail: `Not submitted, and untouched for ${idle} days.`,
        });
      }
    }

    if (
      student.applications.length === 0 &&
      daysSince(student.file_opened_at) >= NO_APPLICATION_THRESHOLD_DAYS
    ) {
      items.push({
        id: `attention-empty-${student.id}`,
        severity: "medium",
        student_id: student.id,
        student_name: student.full_name,
        university_name: null,
        reason: "No applications yet",
        detail: `File opened ${daysSince(student.file_opened_at)} days ago with no university added.`,
      });
    }
  }

  const order = { high: 0, medium: 1 } as const;
  return items.sort(
    (a, b) =>
      order[a.severity] - order[b.severity] ||
      a.student_name.localeCompare(b.student_name),
  );
}

export async function getMockNeedsAttention(): Promise<AttentionItem[]> {
  return computeNeedsAttention(await getMockStudents());
}

export async function getMockNeedsAttentionForStaff(
  staffId: string,
): Promise<AttentionItem[]> {
  return computeNeedsAttention(await getMockStudentsForStaff(staffId));
}

/**
 * The topbar quick-find index.
 *
 * Built from the students the caller already received, so a staff member's
 * index cannot contain a student they were not given — the scoping happens
 * where the rows come from, not here.
 */
export function buildSearchEntries(
  students: StudentWithApplications[],
  studentBasePath: string,
): SearchEntry[] {
  return students.map((student) => ({
    id: student.id,
    label: student.full_name,
    sublabel:
      student.applications.length === 0
        ? "No universities yet"
        : student.applications.map((app) => app.university_name).join(" · "),
    href: `${studentBasePath}/${student.id}`,
    group: "Student",
  }));
}
