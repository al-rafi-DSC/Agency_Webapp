import { assignedWorkers, type StudentWithApplications, type Staff } from "@/types/db";
import type { ApplicationRow, AttentionItem, DashboardStats, SearchEntry, StaffWorkload } from "@/types/ui";

export function dashboardStats(students: StudentWithApplications[]): DashboardStats {
  const applications = students.flatMap((s) => s.applications);
  const breakdown: DashboardStats["breakdown"] = { application: Object.create(null), decision: { pending: 0, accepted: 0, rejected: 0 }, scholarship: Object.create(null) };
  for (const app of applications) {
    breakdown.application[app.application_status] = (breakdown.application[app.application_status] ?? 0) + 1;
    breakdown.decision[app.decision_status] += 1;
    breakdown.scholarship[app.scholarship_status] = (breakdown.scholarship[app.scholarship_status] ?? 0) + 1;
  }
  return {
    totalStudents: students.length,
    unassignedStudents: students.filter((s) => !assignedWorkers(s).some((w) => w.status !== "inactive")).length,
    studentsWithoutApplications: students.filter((s) => !s.applications.length).length,
    totalApplications: applications.length,
    activeApplications: applications.filter((a) => a.is_submitted && a.decision_status === "pending").length,
    acceptedCount: breakdown.decision.accepted,
    rejectedCount: breakdown.decision.rejected,
    admissionsConfirmed: applications.filter((a) => a.admission_confirmed).length,
    scholarshipsAwarded: applications.filter((a) => a.is_awarded).length,
    breakdown,
  };
}

export function staffWorkload(students: StudentWithApplications[], workers: Staff[]): StaffWorkload[] {
  const rows = workers.map((staff) => {
    const assigned = students.filter((s) => assignedWorkers(s).some((w) => w.id === staff.id));
    const stats = dashboardStats(assigned);
    return { staff, studentCount: assigned.length, applicationCount: stats.totalApplications,
      acceptedCount: stats.acceptedCount, awaitingDecisionCount: stats.activeApplications, loadRatio: 0 };
  });
  const busiest = Math.max(1, ...rows.map((r) => r.studentCount));
  return rows.map((r) => ({ ...r, loadRatio: r.studentCount / busiest })).sort((a, b) => b.studentCount - a.studentCount);
}

export function applicationRows(students: StudentWithApplications[]): ApplicationRow[] {
  return students.flatMap((student) => student.applications.map((app) => ({ ...app,
    student: { id: student.id, full_name: student.full_name },
    assigned_staff: student.assigned_staff, assigned_workers: assignedWorkers(student),
  }))).sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export function needsAttention(students: StudentWithApplications[]): AttentionItem[] {
  return students.flatMap((student) => {
    const rows: AttentionItem[] = [];
    const workers = assignedWorkers(student);
    if (!workers.some((w) => w.status !== "inactive")) rows.push({
      id: `unassigned-${student.id}`, severity: "high", student_id: student.id, student_name: student.full_name,
      university_name: null, reason: workers.length ? "Assigned worker is inactive" : "No worker assigned",
      detail: "An admin needs to assign an active worker to this file.",
    });
    for (const app of student.applications) if (app.decision_status === "accepted" && !app.admission_confirmed) rows.push({
      id: `offer-${app.id}`, severity: "high", student_id: student.id, student_name: student.full_name,
      university_name: app.university_name, reason: "Offer not confirmed", detail: "Check enrollment and admission confirmation.",
    });
    return rows;
  });
}

export function buildSearchEntries(students: StudentWithApplications[], basePath: string): SearchEntry[] {
  return students.map((s) => ({ id: s.id, label: s.full_name,
    sublabel: s.applications.map((a) => a.university_name).join(" · ") || "No universities yet",
    href: `${basePath}/${s.id}`, group: "Student" }));
}
