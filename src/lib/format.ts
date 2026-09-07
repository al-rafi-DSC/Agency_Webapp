/**
 * Formatting helpers shared by every screen.
 *
 * ── Why the formatters are module-level constants ────────────────────────────
 * `Intl.DateTimeFormat` is expensive to construct and cheap to reuse, and — far
 * more importantly — every one below pins an explicit locale AND
 * `timeZone: "UTC"`. Without both, a date renders using the server's locale and
 * zone on the server and the visitor's on the client, the two strings differ,
 * and React throws a hydration error. This is the repo convention; do not
 * inline `toLocaleDateString()` in a component.
 *
 * Relative times take an explicit `now` rather than reading the clock, for the
 * same reason: a server render and a client render must agree.
 */

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const longDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

const monthFormatter = new Intl.DateTimeFormat("en-GB", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function formatDate(value: string): string {
  return dateFormatter.format(new Date(value));
}

export function formatDateLong(value: string): string {
  return longDateFormatter.format(new Date(value));
}

export function formatDateTime(value: string): string {
  return dateTimeFormatter.format(new Date(value));
}

export function formatMonth(value: string): string {
  return monthFormatter.format(new Date(value));
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * "3 days ago" / "in 2 weeks" / "today".
 *
 * `now` is a parameter on purpose — see the file header. Callers pass the
 * fixture clock today, and the request time once real data lands.
 */
export function formatRelative(value: string, now: string): string {
  const deltaDays = Math.round(
    (new Date(value).getTime() - new Date(now).getTime()) / DAY_MS,
  );
  const magnitude = Math.abs(deltaDays);

  if (magnitude === 0) return "today";
  if (magnitude === 1) return deltaDays < 0 ? "yesterday" : "tomorrow";

  const [amount, unit] =
    magnitude < 7
      ? [magnitude, "day"]
      : magnitude < 31
        ? [Math.round(magnitude / 7), "week"]
        : magnitude < 365
          ? [Math.round(magnitude / 30), "month"]
          : [Math.round(magnitude / 365), "year"];

  const label = `${amount} ${unit}${amount === 1 ? "" : "s"}`;
  return deltaDays < 0 ? `${label} ago` : `in ${label}`;
}

/** Whole days between two ISO timestamps, ignoring direction. */
export function daysBetween(from: string, to: string): number {
  return Math.abs(
    Math.floor(
      (new Date(to).getTime() - new Date(from).getTime()) / DAY_MS,
    ),
  );
}

/** Avatar fallback: first letter of the first and last word, up to two. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function pluralize(
  count: number,
  singular: string,
  plural = `${singular}s`,
): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

/** Percentage as a whole number; 0 when the denominator is 0. */
export function percentOf(part: number, total: number): number {
  return total === 0 ? 0 : Math.round((part / total) * 100);
}
