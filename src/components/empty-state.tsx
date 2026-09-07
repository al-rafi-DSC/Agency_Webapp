/**
 * The standard empty state.
 *
 * AGENTS.md requires every list to have one, and the reason is worth stating:
 * an empty table and a broken table look identical. An empty state says which
 * one this is, and — where there is one — offers the action that would fill it.
 *
 * Screens should distinguish "nothing exists yet" from "nothing matches the
 * current filter". They are different problems and need different wording, so
 * this component takes the copy rather than inventing it.
 */

import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionHref,
  actionLabel,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-12 text-center",
        className,
      )}
    >
      {Icon ? (
        <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon className="size-5" />
        </span>
      ) : null}

      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        {description ? (
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>

      {actionHref && actionLabel ? (
        <Button
          size="sm"
          className="mt-1"
          nativeButton={false}
          render={<Link href={actionHref}>{actionLabel}</Link>}
        />
      ) : null}
    </div>
  );
}
