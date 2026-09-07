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
      <header className="flex items-start justify-between gap-4 border-b px-4 py-3">
        <div className="min-w-0 space-y-0.5">
          <h2 className="text-sm font-semibold">{title}</h2>
          {description ? (
            <p className="text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>

        {action ??
          (actionHref ? (
            <Link
              href={actionHref}
              className="inline-flex shrink-0 items-center gap-1 rounded text-xs font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {actionLabel ?? "View all"}
              <ArrowRightIcon className="size-3" />
            </Link>
          ) : null)}
      </header>

      <div className={cn("flex-1 p-4", contentClassName)}>{children}</div>
    </section>
  );
}
