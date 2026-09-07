/**
 * Status badges — presentational only.
 *
 * Convention for all UI in this repo: components take typed props and render.
 * They do not fetch, they do not import Supabase, they do not decide who is
 * allowed to see them.
 *
 * The label maps live in `@/types/db` so the UI never prints a raw snake_case
 * database value, and so the wording can change in one place once the owner
 * confirms it (PRD §10 — the status values are still a placeholder set).
 *
 * ── On colour ────────────────────────────────────────────────────────────────
 * Every badge renders its LABEL as well as its colour, so a reader who cannot
 * distinguish the hues still gets the full meaning. Colour is reinforcement
 * here, never the only carrier. The tones are semantic (`success` means a good
 * outcome everywhere it appears), not decorative — so a reader learns the
 * mapping once and it holds across every screen.
 */

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  APPLICATION_STATUS_LABELS,
  DECISION_STATUS_LABELS,
  SCHOLARSHIP_STATUS_LABELS,
  type ApplicationStatus,
  type DecisionStatus,
  type ScholarshipStatus,
} from "@/types/db";

export type StatusTone =
  | "neutral"
  | "brand"
  | "info"
  | "warning"
  | "success"
  | "danger";

/** Soft surfaces, not solid fills — a table of solid badges reads as noise. */
const TONE_CLASSES: Record<StatusTone, string> = {
  neutral: "bg-muted text-muted-foreground border-transparent",
  brand: "bg-primary-soft text-primary-soft-foreground border-transparent",
  info: "bg-info-soft text-info-soft-foreground border-transparent",
  warning: "bg-warning-soft text-warning-soft-foreground border-transparent",
  success: "bg-success-soft text-success-soft-foreground border-transparent",
  danger:
    "bg-destructive-soft text-destructive-soft-foreground border-transparent",
};

const TONE_DOT_CLASSES: Record<StatusTone, string> = {
  neutral: "bg-muted-foreground/60",
  brand: "bg-primary",
  info: "bg-info",
  warning: "bg-warning",
  success: "bg-success",
  danger: "bg-destructive",
};

/*
 * Amber is "waiting on US", cyan is "waiting on the UNIVERSITY". That reading
 * is why in-progress is warm and under-review is cool, and it also happens to
 * be what the palette check demanded: indigo (submitted) against blue
 * (in progress) scored below the normal-vision separation floor, so the two
 * most common states in the table were the two hardest to tell apart.
 */
const APPLICATION_STATUS_TONES: Record<ApplicationStatus, StatusTone> = {
  not_started: "neutral",
  in_progress: "warning",
  submitted: "brand",
  under_review: "info",
};

const DECISION_STATUS_TONES: Record<DecisionStatus, StatusTone> = {
  pending: "neutral",
  accepted: "success",
  rejected: "danger",
};

const SCHOLARSHIP_STATUS_TONES: Record<ScholarshipStatus, StatusTone> = {
  not_applied: "neutral",
  applied: "info",
  awarded: "success",
  denied: "danger",
};

export function StatusPill({
  tone,
  children,
  className,
  showDot = true,
}: {
  tone: StatusTone;
  children: React.ReactNode;
  className?: string;
  showDot?: boolean;
}) {
  return (
    <Badge className={cn(TONE_CLASSES[tone], "gap-1.5 px-2", className)}>
      {showDot ? (
        <span
          aria-hidden
          className={cn(
            "size-1.5 shrink-0 rounded-full",
            TONE_DOT_CLASSES[tone],
          )}
        />
      ) : null}
      {children}
    </Badge>
  );
}

export function ApplicationStatusBadge({
  status,
  className,
}: {
  status: ApplicationStatus;
  className?: string;
}) {
  return (
    <StatusPill tone={APPLICATION_STATUS_TONES[status]} className={className}>
      {APPLICATION_STATUS_LABELS[status]}
    </StatusPill>
  );
}

export function DecisionStatusBadge({
  status,
  className,
}: {
  status: DecisionStatus;
  className?: string;
}) {
  return (
    <StatusPill tone={DECISION_STATUS_TONES[status]} className={className}>
      {DECISION_STATUS_LABELS[status]}
    </StatusPill>
  );
}

export function ScholarshipStatusBadge({
  status,
  className,
}: {
  status: ScholarshipStatus;
  className?: string;
}) {
  return (
    <StatusPill tone={SCHOLARSHIP_STATUS_TONES[status]} className={className}>
      {SCHOLARSHIP_STATUS_LABELS[status]}
    </StatusPill>
  );
}

/**
 * Enrollment fee paid + admission confirmed (PRD §5.2).
 *
 * Status tracking only — v1 processes no real payment (PRD §3), so this renders
 * a state and offers no action to take one.
 */
export function AdmissionBadge({
  confirmed,
  className,
}: {
  confirmed: boolean;
  className?: string;
}) {
  return (
    <StatusPill tone={confirmed ? "success" : "neutral"} className={className}>
      {confirmed ? "Admission confirmed" : "Not confirmed"}
    </StatusPill>
  );
}
