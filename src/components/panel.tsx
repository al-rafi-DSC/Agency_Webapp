/**
 * A titled content panel — the standard container for a block of related
 * content on a dashboard or detail screen.
 *
 * Exists so panels stay consistent instead of each screen inventing its own
 * card header. Composes the shared `.surface-panel` class from `globals.css`,
 * so shadow and border live in one place.
 */

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRightIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function Panel({
  title,
  description,
  action,
  actionHref,
  actionLabel,
  children,
  className,
  contentClassName,
}: {
  title: string;
  description?: string;
  /** A custom action element. Mutually exclusive with actionHref in practice. */
  action?: ReactNode;
  actionHref?: string;
  actionLabel?: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <section className={cn("surface-panel flex flex-col", className)}>
      <header className="flex items-start justify-between gap-4 px-5 pt-5 pb-3">
        <div className="min-w-0 space-y-1">
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          {description ? (
            <p className="text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>

        {action ??
          (actionHref ? (
            <Link
              href={actionHref}
              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary-soft-foreground outline-none transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {actionLabel ?? "View all"}
              <ArrowRightIcon className="size-3" />
            </Link>
          ) : null)}
      </header>

      <div className={cn("flex-1 px-5 pb-5 pt-2", contentClassName)}>{children}</div>
    </section>
  );
}
