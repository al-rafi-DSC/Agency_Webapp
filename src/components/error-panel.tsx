"use client";

/**
 * Shared body for route error boundaries.
 *
 * ── What it deliberately does not show ───────────────────────────────────────
 * No `error.message`, no stack. In Phase 3 these pages fail against a real
 * database, and Postgres error text can name tables, columns and policies — an
 * RLS denial in particular is informative in exactly the way you do not want on
 * screen. React gives the boundary a stable `digest` to match against the
 * server log instead, which is what a support conversation actually needs.
 */

import { RotateCcwIcon, TriangleAlertIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ErrorPanel({
  digest,
  reset,
  description,
}: {
  digest?: string;
  reset: () => void;
  description: string;
}) {
  return (
    <div className="mt-10 flex flex-col items-center gap-4 rounded-xl border border-dashed px-6 py-12 text-center">
      <span className="flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <TriangleAlertIcon className="size-5" />
      </span>

      <div className="space-y-1">
        <p className="text-sm font-medium">Something went wrong</p>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      </div>

      <Button size="sm" variant="outline" onClick={reset}>
        <RotateCcwIcon />
        Try again
      </Button>

      {digest ? (
        <p className="text-xs text-muted-foreground">
          Reference <code className="font-mono">{digest}</code>
        </p>
      ) : null}
    </div>
  );
}
