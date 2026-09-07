import type { ReactNode } from "react";

import { AppShell } from "@/components/shell/app-shell";
import { requireRole } from "@/lib/auth/session";
import { getMockStudents } from "@/lib/mock/students";
import { buildSearchEntries } from "@/lib/mock/selectors";

/**
 * Admin shell — the owner's workspace (PRD §4.1: sees every student and every
 * staff member).
 *
 * A Server Component: it fetches, hands typed props to `AppShell`, and does
 * nothing else. `children` is passed through untouched, so the pages inside
 * stay server-rendered even though the shell itself is a Client Component.
 *
 * ── The role gate is defence in depth, not the boundary ──────────────────────
 * `requireRole` decides whether this SCREEN renders. Row Level Security decides
 * which ROWS any query returns, on every code path, whether or not this file
 * exists (PRD §7). If a staff account somehow reached this layout, it would
 * still read nothing it is not assigned — the gate exists so it gets a
 * redirect instead of a page full of empty states.
 *
 * ── Identity is real; student rows are not, yet ──────────────────────────────
 * `requireRole` returns the signed-in account from Supabase. `getMockStudents`
 * still returns fixtures — the student tables and their policies land with the
 * data layer, not with auth. Swapping that one call is the whole change when
 * they do.
 *
 * The Superadmin route is deliberately absent from `adminNav` and must stay
 * that way (PRD §4.3 — disclosed to the owner, unlisted in the product
 * navigation). Do not add a link to it.
 */
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [user, students] = await Promise.all([
    requireRole(["admin", "superadmin"], {
      previewAs: "admin",
      next: "/admin",
    }),
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
