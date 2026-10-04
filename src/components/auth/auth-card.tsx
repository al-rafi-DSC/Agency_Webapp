/**
 * Shared frame for the signed-out screens.
 *
 * These pages render outside the app shell — there is no sidebar to show
 * somebody who is not signed in — so the centering, the brand mark and the
 * footer live here rather than being repeated on each page.
 *
 * `variant="glass"` is the frosted card on a deep-plum scene used by the
 * sign-in and new-staff pages. Its colours are scoped tokens (`.theme-glass`
 * in globals.css), so the form primitives inside restyle themselves and the
 * scene looks the same whether the visitor's system is in light or dark mode.
 */

import type { ReactNode } from "react";
import Link from "next/link";
import { GraduationCapIcon } from "lucide-react";

export function AuthCard({
  title,
  description,
  children,
  footer,
  variant = "default",
  wide = false,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
  variant?: "default" | "glass";
  /** A little more room for longer forms. */
  wide?: boolean;
}) {
  if (variant === "glass") {
    return (
      <main className="theme-glass glass-scene relative isolate flex flex-1 items-center justify-center overflow-hidden px-4 py-12 text-foreground sm:px-6">
        <div aria-hidden className="glass-orbs">
          <span className="glass-orb glass-orb-1" />
          <span className="glass-orb glass-orb-2" />
          <span className="glass-orb glass-orb-3" />
        </div>

        <div className={wide ? "w-full max-w-md" : "w-full max-w-sm"}>
          <Link
            href="/"
            className="mb-8 flex items-center justify-center gap-2.5 rounded outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span className="glass-mark flex size-9 items-center justify-center rounded-xl text-white">
              <GraduationCapIcon className="size-4.5" />
            </span>
            <span className="text-sm font-semibold tracking-tight text-white">
              Agency Workspace
            </span>
          </Link>

          <div className="glass-panel p-7 sm:p-8">
            <div className="mb-7 space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight text-white">
                {title}
              </h1>
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

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6">
      <div className={wide ? "w-full max-w-md" : "w-full max-w-sm"}>
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
