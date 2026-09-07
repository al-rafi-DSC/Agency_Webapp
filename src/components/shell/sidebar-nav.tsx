"use client";

/**
 * The navigation list itself — shared by the desktop sidebar and the mobile
 * drawer so the two can never drift apart.
 *
 * Client component only because it reads the current pathname to mark the
 * active item. It holds no data and makes no decisions about visibility beyond
 * what the caller hands it in `sections` (see `nav-config.ts` on why that is
 * presentation, not access control).
 */

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { isNavItemActive, type NavSection } from "@/components/shell/nav-config";

export function SidebarNav({
  sections,
  collapsed = false,
  onNavigate,
}: {
  sections: NavSection[];
  /** Icon-rail mode: labels hide and a tooltip carries the name instead. */
  collapsed?: boolean;
  /** Lets the mobile drawer close itself when a link is followed. */
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-5" aria-label="Main">
      {sections.map((section, index) => (
        <div key={section.label ?? `section-${index}`} className="flex flex-col gap-1">
          {section.label ? (
            <p
              className={cn(
                "px-2.5 text-[0.6875rem] font-medium tracking-wide text-muted-foreground/80 uppercase transition-opacity duration-150",
                collapsed && "pointer-events-none h-0 overflow-hidden opacity-0",
              )}
            >
              {section.label}
            </p>
          ) : null}

          {section.items.map((item) => {
            const active = isNavItemActive(item, pathname);

            const link = (
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group/nav relative flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium transition-colors duration-150 outline-none",
                  "focus-visible:ring-3 focus-visible:ring-sidebar-ring/50",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                  collapsed && "justify-center px-0",
                )}
              >
                {/* Active marker doubles the signal, so the current item is not
                    identified by a background tint alone. */}
                <span
                  aria-hidden
                  className={cn(
                    "absolute left-0 h-5 w-0.5 rounded-r-full bg-sidebar-primary transition-opacity duration-150",
                    active ? "opacity-100" : "opacity-0",
                  )}
                />
                <item.icon
                  className={cn(
                    "size-4 shrink-0 transition-colors",
                    active
                      ? "text-sidebar-primary"
                      : "text-muted-foreground group-hover/nav:text-sidebar-foreground",
                  )}
                />
                <span
                  className={cn(
                    "truncate transition-[opacity,width] duration-150",
                    collapsed && "w-0 opacity-0",
                  )}
                >
                  {item.title}
                </span>
              </Link>
            );

            if (!collapsed) {
              return <div key={item.href}>{link}</div>;
            }

            return (
              <Tooltip key={item.href}>
                <TooltipTrigger render={link} />
                <TooltipContent side="right">{item.title}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
