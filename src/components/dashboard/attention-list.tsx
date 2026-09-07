/**
 * The "needs attention" queue.
 *
 * ⚠ This list is a PROMPT FOR A HUMAN, not an automation. Nothing acts on it,
 * nothing is escalated, nothing expires. The thresholds behind it live in
 * `src/lib/mock/selectors.ts` and are UI heuristics, not confirmed product
 * rules — PRD §10 does not define them.
 *
 * Severity is shown with a labelled badge, never colour alone.
 */

import Link from "next/link";
import { AlertTriangleIcon, ChevronRightIcon, ClockIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/empty-state";
import type { AttentionItem } from "@/types/ui";

const SEVERITY_META = {
  high: {
    label: "Act now",
    icon: AlertTriangleIcon,
    chip: "bg-destructive-soft text-destructive-soft-foreground",
  },
  medium: {
    label: "Follow up",
    icon: ClockIcon,
    chip: "bg-warning-soft text-warning-soft-foreground",
  },
} as const;

export function AttentionList({
  items,
  buildHref = (studentId: string) => `/admin/students/${studentId}`,
  limit,
}: {
  items: AttentionItem[];
  buildHref?: (studentId: string) => string;
  limit?: number;
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="Nothing needs attention"
        description="No unconfirmed offers, unassigned files, or stalled applications."
        className="border-0 py-6"
      />
    );
  }

  const shown = typeof limit === "number" ? items.slice(0, limit) : items;

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-1.5">
        {shown.map((item) => {
          const meta = SEVERITY_META[item.severity];

          return (
            <li key={item.id}>
              <Link
                href={buildHref(item.student_id)}
                className="group/item flex items-start gap-3 rounded-lg border p-3 outline-none transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <span
                  aria-hidden
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-lg",
                    meta.chip,
                  )}
                >
                  <meta.icon className="size-3.5" />
                </span>

                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="flex flex-wrap items-center gap-x-2 text-sm leading-snug">
                    <span className="font-medium group-hover/item:underline">
                      {item.student_name}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[0.6875rem] leading-none font-medium",
                        meta.chip,
                      )}
                    >
                      {meta.label}
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground/80">
                      {item.reason}
                    </span>
                    {item.university_name ? ` · ${item.university_name}` : null}
                  </p>
                  <p className="text-xs text-muted-foreground">{item.detail}</p>
                </div>

                <ChevronRightIcon className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover/item:translate-x-0.5" />
              </Link>
            </li>
          );
        })}
      </ul>

      {typeof limit === "number" && items.length > limit ? (
        <p className="px-1 text-xs text-muted-foreground">
          {items.length - limit} more not shown.
        </p>
      ) : null}
    </div>
  );
}
