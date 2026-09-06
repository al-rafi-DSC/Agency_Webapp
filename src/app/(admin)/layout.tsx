import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Admin shell — navigation visible to the owner only.
 *
 * NOTE: the Superadmin route is deliberately absent from this nav and must stay
 * that way (PRD §4.3 — disclosed to the owner, but unlisted in the product
 * navigation). Do not add a link to it here.
 *
 * Phase 3 adds a server-side role check in this layout. It will be defence in
 * depth on top of RLS, not a replacement for it.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b">
        <nav className="mx-auto flex w-full max-w-6xl items-center gap-6 px-6 py-4">
          <Link href="/" className="text-sm font-semibold">
            Agency Workspace
          </Link>
          <Link
            href="/admin/students"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Students
          </Link>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
