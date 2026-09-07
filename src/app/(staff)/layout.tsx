import type { ReactNode } from "react";

import { AppShell } from "@/components/shell/app-shell";
import {
  MOCK_CURRENT_STAFF_ID,
  getMockSessionUser,
  getMockStudentsForStaff,
} from "@/lib/mock/students";
import { buildSearchEntries } from "@/lib/mock/selectors";

/**
 * Staff shell — a single staff member's workspace (PRD §4.2: sees only the
 * students assigned to them).
 *
 * ── WHERE THE SCOPING ACTUALLY LIVES ─────────────────────────────────────────
 * `getMockStudentsForStaff` filters the fixtures by staff id. That filter is a
 * FIXTURE CONVENIENCE, not the access control. In Phase 3 it becomes the same
 * unfiltered query the admin runs, and Row Level Security decides which rows
 * come back for this account (PRD §7). A staff member querying another staff
 * member's student is refused by the database, on every code path, whether or
 * not this file exists.
 *
 * Likewise `staffNav` omits Staff and Settings because they are not useful to a
 * staff member — omitting a link protects nothing.
 *
 * `MOCK_CURRENT_STAFF_ID` stands in for the session until auth is wired. It is
 * a preview identity, not a login.
 */
export default async function StaffLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [user, students] = await Promise.all([
    getMockSessionUser("staff"),
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
