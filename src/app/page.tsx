import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRightIcon, GraduationCapIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { homePathForRole } from "@/lib/auth/roles";
import { getSessionUser } from "@/lib/auth/session";
import { isUiPreview } from "@/lib/supabase/env";

/**
 * Entry point.
 *
 * Resolves the signed-in account server-side and redirects: admin → /admin,
 * staff → /staff, nobody → /login. It never renders a role chooser, because a
 * user does not pick their role — the database says what they are, and RLS
 * enforces it regardless of which URL they type.
 *
 * ── The switchboard below survives, for preview mode only ────────────────────
 * With `NEXT_PUBLIC_UI_PREVIEW=true` there is no session to redirect on, so the
 * two workspaces are linked for UI work. `isUiPreview()` is hard-gated on a
 * non-production NODE_ENV, so this branch cannot be reached from a deployed
 * build even if the variable is set there by mistake.
 */
export default async function Home() {
  if (!isUiPreview()) {
    const user = await getSessionUser();
    redirect(user ? homePathForRole(user.role) : "/login");
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16 sm:px-6">
      <div className="w-full max-w-md text-center">
        <span className="mx-auto mb-6 flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <GraduationCapIcon className="size-5" />
        </span>

        <h1 className="text-2xl font-semibold tracking-tight">
          Agency Workspace
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Student files and university applications, for the whole agency.
        </p>

        <div className="mt-8 flex flex-col gap-2">
          <Button
            className="w-full"
            nativeButton={false}
            render={
              <Link href="/login">
                Sign in
                <ArrowRightIcon />
              </Link>
            }
          />
        </div>

        <div className="mt-10 border-t pt-6">
          <p className="text-xs font-medium text-muted-foreground">
            Preview mode — no login, mock data
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href="/admin">Admin workspace</Link>}
            />
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href="/staff">Staff workspace</Link>}
            />
          </div>
          <p className="mx-auto mt-4 max-w-xs text-xs leading-relaxed text-muted-foreground">
            Once auth is wired, this page redirects by role and these links go
            away — what an account can see is decided by the database, not by
            which link was clicked.
          </p>
        </div>
      </div>
    </main>
  );
}
