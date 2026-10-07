/**
 * The welcome banner at the top of a dashboard.
 *
 * Presentational: the page hands over the name, the date label, the headline
 * counts and the action links. It always renders the violet sign-in scene
 * (`.hero-banner` in globals.css), in light and dark mode alike, so its text is
 * white by design rather than read from the theme tokens.
 */

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { SparklesIcon } from "lucide-react";

export interface HeroHighlight {
  label: string;
  value: number | string;
  icon: LucideIcon;
}

export function DashboardHero({
  name,
  dateLabel,
  subtitle,
  highlights,
  actions,
}: {
  name: string;
  dateLabel: string;
  subtitle: string;
  highlights: HeroHighlight[];
  actions?: ReactNode;
}) {
  const firstName = name.trim().split(/\s+/)[0] || name;

  return (
    <section className="hero-banner px-6 py-7 sm:px-8 sm:py-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-xl space-y-3">
          <p className="hero-chip inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-white/85">
            <SparklesIcon className="size-3.5" aria-hidden />
            {dateLabel}
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            Welcome back, {firstName}
          </h1>
          <p className="text-sm text-white/75 sm:text-base">{subtitle}</p>
          {actions ? <div className="flex flex-wrap gap-2 pt-1">{actions}</div> : null}
        </div>

        {highlights.length ? (
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:w-auto lg:min-w-[22rem]">
            {highlights.map((item) => (
              <div key={item.label} className="hero-chip rounded-2xl px-4 py-3">
                <dt className="flex items-center gap-1.5 text-xs text-white/70">
                  <item.icon className="size-3.5" aria-hidden />
                  {item.label}
                </dt>
                <dd className="mt-1 text-2xl font-bold tabular-nums">{item.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
    </section>
  );
}
