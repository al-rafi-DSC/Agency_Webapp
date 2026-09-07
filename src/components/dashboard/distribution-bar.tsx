/**
 * A 100% stacked bar plus its legend — how a set of statuses divides a total.
 *
 * ── Why it is built this way ─────────────────────────────────────────────────
 *
 * • Every segment is directly labelled in the legend with its count AND its
 *   share, so the legend IS the table view. Nothing here is knowable only by
 *   hovering, which is why this stays a Server Component with no client-side
 *   JavaScript: an interaction layer would add no information.
 *
 * • Colour never carries identity alone. Each legend row pairs a colour chip
 *   with the status label, and the labels come from the `*_STATUS_LABELS` maps
 *   so the wording changes in one place (PRD §10 — statuses are placeholders).
 *
 * • A 2px gap separates adjacent segments so two similar fills cannot read as
 *   one, and each segment carries a 4px radius rather than the whole bar being
 *   rounded end-to-end — that way a small segment still looks like a segment.
 *
 * • Zero-value segments are dropped from the bar and kept in the legend showing
 *   0. A zero-width sliver is noise; a legend row saying "0" is information.
 */

import { cn } from "@/lib/utils";
import { percentOf } from "@/lib/format";

export interface DistributionSegment {
  key: string;
  label: string;
  value: number;
  /** Tailwind background utility for the mark, e.g. "bg-viz-submitted". */
  colorClass: string;
}

export function DistributionBar({
  segments,
  total,
  emptyMessage = "Nothing to show yet.",
  className,
}: {
  segments: DistributionSegment[];
  total: number;
  emptyMessage?: string;
  className?: string;
}) {
  const visible = segments.filter((segment) => segment.value > 0);

  if (total === 0 || visible.length === 0) {
    return (
      <p className={cn("py-6 text-sm text-muted-foreground", className)}>
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div
        className="flex h-3 w-full gap-0.5 overflow-hidden"
        role="img"
        aria-label={visible
          .map(
            (segment) =>
              `${segment.label}: ${segment.value} of ${total} (${percentOf(segment.value, total)}%)`,
          )
          .join(", ")}
      >
        {visible.map((segment) => (
          <span
            key={segment.key}
            className={cn("h-full rounded-[4px]", segment.colorClass)}
            style={{ width: `${(segment.value / total) * 100}%` }}
          />
        ))}
      </div>

      <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
        {segments.map((segment) => (
          <div
            key={segment.key}
            className="flex items-center justify-between gap-3"
          >
            <dt className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
              <span
                aria-hidden
                className={cn(
                  "size-2 shrink-0 rounded-[3px]",
                  segment.value > 0 ? segment.colorClass : "bg-border",
                )}
              />
              <span className="truncate">{segment.label}</span>
            </dt>
            <dd className="shrink-0 text-sm font-medium tabular-nums">
              {segment.value}
              <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                {percentOf(segment.value, total)}%
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
