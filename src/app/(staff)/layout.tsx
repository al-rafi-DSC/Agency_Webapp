import type { ReactNode } from "react";

import { AppShell } from "@/components/shell/app-shell";
import { requireSessionUser } from "@/lib/auth/session";
import { getStudents } from "@/lib/supabase/workspace";
import { isUiPreview } from "@/lib/supabase/env";
import { buildSearchEntries } from "@/lib/workspace/selectors";


export default async function StaffLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [user, students] = await Promise.all([
    requireSessionUser({ previewAs: "staff", next: "/staff" }),
    getStudents("staff"),
  ]);

  return (
    <AppShell
      navKey="staff"
      previewMode={isUiPreview()}
      user={user}
      workspaceLabel="Staff"
      homeHref="/staff"
      searchEntries={buildSearchEntries(students, "/staff/students")}
    >
      {children}
    </AppShell>
  );
}
