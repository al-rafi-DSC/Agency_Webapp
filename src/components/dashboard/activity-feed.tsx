/**
 * Recent activity, newest first.
 *
 * `now` is a required prop rather than something this component reads from the
 * clock: a relative timestamp computed during a server render and again during
 * hydration would produce two different strings and a hydration error. The
 * caller passes one fixed instant and both renders agree.
 *
 * ⚠ Activity events are a UI fixture — `PRD.md` §5 defines no activity table.
 * See `src/types/ui.ts`. This screen is partly a question for the owner: is an
 * audit trail wanted, and at what granularity?
 */

import Link from "next/link";
import {
  BadgeCheckIcon,
  FilePlus2Icon,
  FolderPlusIcon,
  GraduationCapIcon,
  MessageSquareIcon,
  RefreshCwIcon,
  ScaleIcon,
  UserPlusIcon,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { formatDateTime, formatRelative } from "@/lib/format";
import { EmptyState } from "@/components/empty-state";
import type { ActivityEvent, ActivityKind } from "@/types/ui";

const KIND_ICONS: Record<ActivityKind, LucideIcon> = {
  file_opened: FolderPlusIcon,
  student_assigned: UserPlusIcon,
  application_added: FilePlus2Icon,
  application_status_changed: RefreshCwIcon,
  decision_received: ScaleIcon,
  scholarship_updated: GraduationCapIcon,
  admission_confirmed: BadgeCheckIcon,
  note_added: MessageSquareIcon,
};

const KIND_TONES: Record<ActivityKind, string> = {
  file_opened: "bg-muted text-muted-foreground",
  student_assigned: "bg-muted text-muted-foreground",
  application_added: "bg-primary-soft text-primary-soft-foreground",
  application_status_changed: "bg-info-soft text-info-soft-foreground",
  decision_received: "bg-warning-soft text-warning-soft-foreground",
  scholarship_updated: "bg-info-soft text-info-soft-foreground",
  admission_confirmed: "bg-success-soft text-success-soft-foreground",
  note_added: "bg-muted text-muted-foreground",
};

export function ActivityFeed({
  events,
  now,
  buildHref = (studentId: string) => `/admin/students/${studentId}`,
}: {
  events: ActivityEvent[];
  /** A single fixed instant — see the file header on why this is a prop. */
  now: string;
  buildHref?: (studentId: string) => string;
}) {
  if (events.length === 0) {
    return (
      <EmptyState
        title="No activity yet"
        description="Updates to student files will appear here."
        className="border-0 py-6"
      />
    );
  }

  return (
    <ol className="flex flex-col">
      {events.map((event, index) => {
        const Icon = KIND_ICONS[event.kind];
        const last = index === events.length - 1;

        return (
          <li key={event.id} className="flex gap-3">
            {/* Icon rail. The connector is drawn per-item and skipped on the
                last one, so the line stops at the final event instead of
                trailing into empty space. */}
            <div className="flex flex-col items-center">
              <span
                aria-hidden
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full",
                  KIND_TONES[event.kind],
                )}
              >
                <Icon className="size-3.5" />
              </span>
              {!last ? <span className="w-px flex-1 bg-border" /> : null}
            </div>

            <div className={cn("min-w-0 flex-1", last ? "pb-0" : "pb-5")}>
              <p className="text-sm leading-snug">
                <Link
                  href={buildHref(event.student_id)}
                  className="font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {event.student_name}
                </Link>
                <span className="text-muted-foreground"> — {event.summary}</span>
              </p>

              <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                {event.university_name ? (
                  <>
                    <span className="truncate">{event.university_name}</span>
                    <span aria-hidden>·</span>
                  </>
                ) : null}
                <time dateTime={event.occurred_at} title={formatDateTime(event.occurred_at)}>
                  {formatRelative(event.occurred_at, now)}
                </time>
                {event.actor_name ? (
                  <>
                    <span aria-hidden>·</span>
                    <span className="truncate">{event.actor_name}</span>
                  </>
                ) : null}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
