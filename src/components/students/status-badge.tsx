/**
 * Status badges — presentational only.
 *
 * Convention for all generated UI: components take typed props and render.
 * They do not fetch, they do not import Supabase, they do not decide who is
 * allowed to see them.
 *
 * The label maps live in `@/types/db` so the UI never prints a raw snake_case
 * database value, and so the wording can change in one place once the owner
 * confirms it (PRD §10 — status values are still a placeholder set).
 */

import { Badge } from "@/components/ui/badge";
import {
  APPLICATION_STATUS_LABELS,
  DECISION_STATUS_LABELS,
  SCHOLARSHIP_STATUS_LABELS,
  type ApplicationStatus,
  type DecisionStatus,
  type ScholarshipStatus,
} from "@/types/db";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

const APPLICATION_STATUS_VARIANTS: Record<ApplicationStatus, BadgeVariant> = {
  not_started: "outline",
  in_progress: "secondary",
  submitted: "default",
  under_review: "secondary",
};

const DECISION_STATUS_VARIANTS: Record<DecisionStatus, BadgeVariant> = {
  pending: "secondary",
  accepted: "default",
  rejected: "destructive",
};

const SCHOLARSHIP_STATUS_VARIANTS: Record<ScholarshipStatus, BadgeVariant> = {
  not_applied: "outline",
  applied: "secondary",
  awarded: "default",
  denied: "destructive",
};

export function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <Badge variant={APPLICATION_STATUS_VARIANTS[status]}>
      {APPLICATION_STATUS_LABELS[status]}
    </Badge>
  );
}

export function DecisionStatusBadge({ status }: { status: DecisionStatus }) {
  return (
    <Badge variant={DECISION_STATUS_VARIANTS[status]}>
      {DECISION_STATUS_LABELS[status]}
    </Badge>
  );
}

export function ScholarshipStatusBadge({ status }: { status: ScholarshipStatus }) {
  return (
    <Badge variant={SCHOLARSHIP_STATUS_VARIANTS[status]}>
      {SCHOLARSHIP_STATUS_LABELS[status]}
    </Badge>
  );
}
