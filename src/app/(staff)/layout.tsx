import type { ReactNode } from "react";

import { AppShell } from "@/components/shell/app-shell";
import { requireSessionUser } from "@/lib/auth/session";
import {
  MOCK_CURRENT_STAFF_ID,
  getMockStudentsForStaff,
} from "@/lib/mock/students";
import { buildSearchEntries } from "@/lib/mock/selectors";

/**
 * Staff shell — a single staff member's workspace (PRD §4.2: sees only the
 * students assigned to them).
 *
 * ── WHERE THE SCOPING ACTUALLY LIVES ─────────────────────────────────────────
 * `getMockStudentsForStaff` filters the fixtures by staff id. That filter is a
 * FIXTURE CONVENIENCE, not the access control. When the student tables land it
 * becomes the same unfiltered query the admin runs, and Row Level Security
 * decides which rows come back for this account (PRD §7). A staff member
 * querying another staff member's student is refused by the database, on every
 * code path, whether or not this file exists.
 *
 * Likewise `staffNav` omits Staff and Settings because they are not useful to
 * a staff member — omitting a link protects nothing.
 *
 * ── Why this gate is requireSessionUser, not requireRole(["staff"]) ──────────
 * An Admin looking at the staff workspace is legitimate: they can already read
 * every student, so nothing is exposed by letting them see the view their team
 * sees. Locking them out would be theatre. What is required is a session.
 *
 * `MOCK_CURRENT_STAFF_ID` still stands in for WHICH fixtures to show, because
 * the student rows are fixtures. The identity above it is real.
 */
export default async function StaffLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [user, students] = await Promise.all([
    requireSessionUser({ previewAs: "staff", next: "/staff" }),
    getMockStudentsForStaff(MOCK_CURRENT_STAFF_ID),
  ]);

  return (
    <AppShell
      navKey="staff"
      user={user}
      workspaceLabel="Staff"
      homeHref="/staff"
      searchEntries={buildSearchEntries(students, "/staff/students")}
    >
      {children}
    </AppShell>
  );
}
