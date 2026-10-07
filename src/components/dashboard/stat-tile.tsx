/**
 * A single headline number.
 *
 * Deliberately NOT a chart. One number answering one question is read faster as
 * a number than as any plotted form — a chart here would be decoration around a
 * value the reader already has.
 *
 * `tabular-nums` keeps the digits from re-flowing the tile as values change,
 * and the row of tiles from jittering against each other.
 *
 * The tone colours the icon badge and a soft corner glow. It is never the only
 * carrier of meaning: the label and hint say what the number is.
 */

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRightIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type StatTone = "default" | "info" | "success" | "warning" | "danger";

const TONE_CLASSES: Record<StatTone, { badge: string; glow: string }> = {
  default: {
    badge: "from-violet-500 to-fuchsia-500 shadow-violet-500/40",
    glow: "bg-violet-500",
  },
  info: {
    badge: "from-sky-500 to-cyan-400 shadow-sky-500/40",
    glow: "bg-sky-500",
  },
  success: {
    badge: "from-emerald-500 to-teal-400 shadow-emerald-500/40",
    glow: "bg-emerald-500",
  },
  warning: {
    badge: "from-amber-500 to-orange-400 shadow-amber-500/40",
    glow: "bg-amber-500",
  },
  danger: {
    badge: "from-rose-500 to-red-500 shadow-rose-500/40",
    glow: "bg-rose-500",
  },
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
  const classes = TONE_CLASSES[tone];

  return (
    <div className="surface-panel stat-tile flex flex-col gap-4 p-5">
      {/* Soft corner glow in the tone colour — decoration only. */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute -top-10 -right-10 size-32 rounded-full opacity-[0.14] blur-2xl dark:opacity-25",
          classes.glow,
        )}
      />

      <div className="flex items-center justify-between gap-3">
        <span
          aria-hidden
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg",
            classes.badge,
          )}
        >
          <Icon className="size-5" />
        </span>

        {href ? (
          <Link
            href={href}
            className="relative inline-flex items-center gap-1 rounded-full border bg-background/60 px-2.5 py-1 text-xs font-medium text-muted-foreground outline-none transition-colors hover:border-primary/40 hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {linkLabel ?? "View"}
            <ArrowUpRightIcon className="size-3" />
          </Link>
        ) : null}
      </div>

      <div className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="text-4xl leading-none font-bold tracking-tight tabular-nums">
          {value}
        </p>
      </div>

      {hint ? (
        <p className="mt-auto text-xs leading-snug text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
