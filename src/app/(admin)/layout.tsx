import type { ReactNode } from "react";

import { AppShell } from "@/components/shell/app-shell";
import { getMockSessionUser, getMockStudents } from "@/lib/mock/students";
import { buildSearchEntries } from "@/lib/mock/selectors";

/**
 * Admin shell — the owner's workspace (PRD §4.1: sees every student and every
 * staff member).
 *
 * A Server Component: it fetches, hands typed props to `AppShell`, and does
 * nothing else. `children` is passed through untouched, so the pages inside
 * stay server-rendered even though the shell itself is a Client Component.
 *
 * TWO THINGS TO KEEP TRUE HERE:
 *
 * 1. The Superadmin route is deliberately absent from `adminNav` and must stay
 *    that way (PRD §4.3 — disclosed to the owner, unlisted in the product
 *    navigation). Do not add a link to it.
 *
 * 2. Phase 3 adds a server-side role check in this layout. That will be defence
 *    in depth ON TOP OF Row Level Security, never a replacement for it — the
 *    database, not this file, decides which rows an account can read.
 */
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [user, students] = await Promise.all([
    getMockSessionUser("admin"),
    getMockStudents(),
  ]);

  return (
    <AppShell
      navKey="admin"
      user={user}
      workspaceLabel="Admin"
      homeHref="/admin"
      searchEntries={buildSearchEntries(students, "/admin/students")}
    >
      {children}
    </AppShell>
  );
}
