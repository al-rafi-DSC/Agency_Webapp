/**
 * Navigation for the app shell.
 *
 * ── This file is PRESENTATION, not access control ────────────────────────────
 * The staff configuration omits Staff and Settings because a staff member has
 * no use for them, not because omitting a link protects anything. Anyone can
 * type a URL. What a staff account may actually READ is decided by Row Level
 * Security in the database (PRD §7), and nothing in this file changes that.
 *
 * The Superadmin route is deliberately absent from BOTH configurations, and
 * must stay that way — PRD §4.3 makes it unlisted in the product navigation.
 * Do not add it here.
 */

import type { LucideIcon } from "lucide-react";
import {
  FileTextIcon,
  CalendarDaysIcon,
  LayoutDashboardIcon,
  SettingsIcon,
  UsersIcon,
  UserCogIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  /** Match the pathname exactly instead of by prefix — for section roots. */
  exact?: boolean;
}

export interface NavSection {
  label?: string;
  items: NavItem[];
}

export const adminNav: NavSection[] = [
  {
    items: [
      {
        title: "Dashboard",
        href: "/admin",
        icon: LayoutDashboardIcon,
        exact: true,
      },
    ],
  },
  {
    label: "Pipeline",
    items: [
      { title: "Students", href: "/admin/students", icon: UsersIcon },
      {
        title: "Applications",
        href: "/admin/applications",
        icon: FileTextIcon,
      },
    ],
  },
  {
    label: "Workspace",
    items: [
      { title: "Workers", href: "/admin/staff", icon: UserCogIcon },
      { title: "Yearly summary", href: "/admin/reports", icon: CalendarDaysIcon },
      { title: "Settings", href: "/admin/settings", icon: SettingsIcon },
    ],
  },
];

export const staffNav: NavSection[] = [
  {
    items: [
      {
        title: "Dashboard",
        href: "/staff",
        icon: LayoutDashboardIcon,
        exact: true,
      },
      { title: "My students", href: "/staff/students", icon: UsersIcon },
    ],
  },
];

/**
 * Which navigation a shell renders.
 *
 * The shell takes this KEY rather than the section array itself. A `NavItem`
 * holds an `icon`, which is a React component, and a component cannot be passed
 * as a prop from a Server Component to a Client Component — React has nothing
 * to serialize it into. A string crosses the boundary fine, and the client
 * shell looks the sections up here.
 *
 * It is also the honest shape: the nav a role sees is a fixed, known list, not
 * something a caller assembles. And it is still only presentation — omitting a
 * link protects nothing, the database decides what an account may read.
 */
export type NavKey = "admin" | "staff";

export const NAV_SECTIONS: Record<NavKey, NavSection[]> = {
  admin: adminNav,
  staff: staffNav,
};

/** Whether a nav item should render as the current page. */
export function isNavItemActive(item: NavItem, pathname: string): boolean {
  return item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(`${item.href}/`);
}
