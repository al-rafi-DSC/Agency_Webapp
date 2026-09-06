import Link from "next/link";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";

/**
 * Temporary landing page. Phase 3 replaces this with a role-based redirect:
 * admin → /admin/students, staff → /staff/students, resolved server-side from
 * the authenticated user's role.
 */
export default function Home() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16">
      <PageHeader
        title="Agency Workspace"
        description="Internal workspace for managing students and university applications."
      />
      <div className="flex flex-wrap gap-3">
        <Button render={<Link href="/admin/students">Admin · Students</Link>} />
      </div>
      <p className="mt-8 text-sm text-muted-foreground">
        Scaffold only — screens currently render from mock fixtures. See
        <code className="mx-1 rounded bg-muted px-1 py-0.5">AGENTS.md</code>
        for how UI work is split between generated and hand-written code.
      </p>
    </main>
  );
}
