/**
 * Shared frame for the signed-out screens.
 *
 * These pages render outside the app shell — there is no sidebar to show
 * somebody who is not signed in — so the centering, the brand mark and the
 * footer live here rather than being repeated on each page.
 */

import type { ReactNode } from "react";
import Link from "next/link";
import { GraduationCapIcon } from "lucide-react";

export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="mb-8 flex items-center justify-center gap-2 rounded outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <GraduationCapIcon className="size-4" />
          </span>
          <span className="text-sm font-semibold tracking-tight">
            Agency Workspace
          </span>
        </Link>

        <div className="surface-panel p-6">
          <div className="mb-6 space-y-1.5">
            <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>

          {children}
        </div>

        {footer ? (
          <div className="mt-6 text-center text-sm text-muted-foreground">
            {footer}
          </div>
        ) : null}
      </div>
    </main>
  );
}
