import type { ReactNode } from "react";

import { AppShell } from "@/components/shell/app-shell";
import { requireRole } from "@/lib/auth/session";
import { getStudents } from "@/lib/supabase/workspace";
import { isUiPreview } from "@/lib/supabase/env";
import { buildSearchEntries } from "@/lib/workspace/selectors";


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
    getStudents(),
  ]);

  return (
    <AppShell
      navKey="admin"
      previewMode={isUiPreview()}
      user={user}
      workspaceLabel="Admin"
      homeHref="/admin"
      searchEntries={buildSearchEntries(students, "/admin/students")}
    >
      {children}
    </AppShell>
  );
}
