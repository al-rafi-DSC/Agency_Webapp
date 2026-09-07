/**
 * A single headline number.
 *
 * Deliberately NOT a chart. One number answering one question is read faster as
 * a number than as any plotted form — a chart here would be decoration around a
 * value the reader already has.
 *
 * `tabular-nums` keeps the digits from re-flowing the tile as values change,
 * and the row of tiles from jittering against each other.
 */

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRightIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type StatTone = "default" | "success" | "warning" | "danger";

const TONE_ICON_CLASSES: Record<StatTone, string> = {
  default: "bg-primary-soft text-primary-soft-foreground",
  success: "bg-success-soft text-success-soft-foreground",
  warning: "bg-warning-soft text-warning-soft-foreground",
  danger: "bg-destructive-soft text-destructive-soft-foreground",
};

export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  href,
  linkLabel,
}: {
  label: string;
  value: number | string;
  hint?: string;
  icon: LucideIcon;
  tone?: StatTone;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="surface-panel flex flex-col gap-3 p-4 transition-shadow duration-150 hover:shadow-[0_2px_8px_-2px_oklch(0_0_0/0.08)]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span
          aria-hidden
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg",
            TONE_ICON_CLASSES[tone],
          )}
        >
          <Icon className="size-4" />
        </span>
      </div>

      <p className="text-3xl leading-none font-semibold tracking-tight tabular-nums">
        {value}
      </p>

      {hint ? (
        <p className="text-xs leading-snug text-muted-foreground">{hint}</p>
      ) : null}

      {href ? (
        <Link
          href={href}
          className="mt-auto inline-flex w-fit items-center gap-1 rounded text-xs font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {linkLabel ?? "View"}
          <ArrowRightIcon className="size-3" />
        </Link>
      ) : null}
    </div>
  );
}
