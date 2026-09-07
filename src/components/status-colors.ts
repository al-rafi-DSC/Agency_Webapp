/**
 * Which validated mark colour each status gets.
 *
 * Shared by the distribution bars and by the compact status chips in the
 * students table, so a status is the same colour wherever it appears. The
 * values are the `--viz-*` tokens, which were checked for colour-vision
 * separation in both themes — see the comment block in `globals.css` before
 * changing any of them.
 */

import type {
  ApplicationStatus,
  DecisionStatus,
  ScholarshipStatus,
} from "@/types/db";

export const APPLICATION_MARK_CLASSES: Record<ApplicationStatus, string> = {
  not_started: "bg-viz-neutral",
  in_progress: "bg-viz-progress",
  submitted: "bg-viz-submitted",
  under_review: "bg-viz-review",
};

export const DECISION_MARK_CLASSES: Record<DecisionStatus, string> = {
  pending: "bg-viz-neutral",
  accepted: "bg-viz-accepted",
  rejected: "bg-viz-rejected",
};

export const SCHOLARSHIP_MARK_CLASSES: Record<ScholarshipStatus, string> = {
  not_applied: "bg-viz-neutral",
  applied: "bg-viz-review",
  awarded: "bg-viz-accepted",
  denied: "bg-viz-rejected",
};
