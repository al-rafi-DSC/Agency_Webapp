/**
 * Turns a status breakdown into distribution-bar segments.
 *
 * Presentational mapping only — it decides which validated `--viz-*` mark a
 * status gets and pulls the label from `@/types/db`, so no screen hard-codes a
 * status string or a colour. Both dashboards import this, which is what keeps
 * "submitted is indigo" true everywhere rather than per-screen.
 *
 * The status ORDER here is pipeline order (not started → in progress →
 * submitted → under review), so the stacked bar reads left to right as work
 * moving forward. Do not sort these by value: a bar whose segments reorder as
 * the data changes is unreadable across two glances.
 */

import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABELS,
  DECISION_STATUSES,
  DECISION_STATUS_LABELS,
  SCHOLARSHIP_STATUSES,
  SCHOLARSHIP_STATUS_LABELS,
} from "@/types/db";
import type { DistributionSegment } from "@/components/dashboard/distribution-bar";
import type { StatusBreakdown } from "@/types/ui";
import {
  APPLICATION_MARK_CLASSES,
  DECISION_MARK_CLASSES,
  SCHOLARSHIP_MARK_CLASSES,
} from "@/components/status-colors";

export function applicationSegments(
  breakdown: StatusBreakdown,
): DistributionSegment[] {
  return APPLICATION_STATUSES.map((status) => ({
    key: status,
    label: APPLICATION_STATUS_LABELS[status],
    value: breakdown.application[status],
    colorClass: APPLICATION_MARK_CLASSES[status],
  }));
}

export function decisionSegments(
  breakdown: StatusBreakdown,
): DistributionSegment[] {
  return DECISION_STATUSES.map((status) => ({
    key: status,
    label: DECISION_STATUS_LABELS[status],
    value: breakdown.decision[status],
    colorClass: DECISION_MARK_CLASSES[status],
  }));
}

export function scholarshipSegments(
  breakdown: StatusBreakdown,
): DistributionSegment[] {
  return SCHOLARSHIP_STATUSES.map((status) => ({
    key: status,
    label: SCHOLARSHIP_STATUS_LABELS[status],
    value: breakdown.scholarship[status],
    colorClass: SCHOLARSHIP_MARK_CLASSES[status],
  }));
}
