"use client";

/**
 * The application chrome: sidebar, topbar, and the content well.
 *
 * ── Why this is a Client Component, and why that costs nothing ────────────────
 * It holds two pieces of local UI state — sidebar collapsed, mobile drawer open
 * — which cannot live on the server. `children` arrives as a prop from the
 * Server Component layout above, so the pages inside stay server-rendered:
 * a Client Component parent does not make its children client components.
 *
 * It receives the user, a nav key, and the search index as typed props. It
 * fetches nothing and decides nothing about who may see what.
 *
 * The nav arrives as a KEY, not as the sections themselves: nav items carry
 * icon components, and a component cannot be serialized across the server ->
 * client boundary. See `nav-config.ts`.
 */

import { useCallback, useSyncExternalStore, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCapIcon, MenuIcon, PanelLeftIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarNav } from "@/components/shell/sidebar-nav";
import { UserMenu } from "@/components/shell/user-menu";
import { GlobalSearch } from "@/components/shell/global-search";
import { NAV_SECTIONS, type NavKey } from "@/components/shell/nav-config";
import type { SearchEntry, SessionUser } from "@/types/ui";

const COLLAPSE_STORAGE_KEY = "agency-workspace:sidebar-collapsed";

/**
 * The sidebar preference, as an external store.
 *
 * `localStorage` is exactly what `useSyncExternalStore` is for: it exists only
 * in the browser, so the server render and the hydration pass use
 * `getServerSnapshot` (expanded, the safe default) and React re-renders with
 * the stored value once hydrated. Reading it during render would make the first
 * client paint disagree with the server markup; reading it in an effect and
 * calling setState would cause a cascading render.
 *
 * Every access is wrapped: a private window or blocked site data throws on the
 * accessor itself, and the preference simply not persisting is fine.
 */
const collapseListeners = new Set<() => void>();
let collapseCache: boolean | null = null;

function getCollapsedSnapshot(): boolean {
  if (collapseCache === null) {
    try {
      collapseCache = window.localStorage.getItem(COLLAPSE_STORAGE_KEY) === "1";
    } catch {
      collapseCache = false;
    }
  }
  return collapseCache;
}

function getCollapsedServerSnapshot(): boolean {
  return false;
}

function subscribeToCollapsed(onStoreChange: () => void): () => void {
  collapseListeners.add(onStoreChange);
  return () => {
    collapseListeners.delete(onStoreChange);
  };
}

function writeCollapsed(next: boolean): void {
  collapseCache = next;
  try {
    window.localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? "1" : "0");
  } catch {
    // Preference does not persist. Not worth surfacing.
  }
  for (const listener of collapseListeners) listener();
}

export function AppShell({
  navKey,
  user,
  searchEntries,
  homeHref,
  workspaceLabel,
  previewMode = false,
  children,
}: {
  navKey: NavKey;
  user: SessionUser;
  searchEntries: SearchEntry[];
  homeHref: string;
  workspaceLabel: string;
  previewMode?: boolean;
  children: ReactNode;
}) {
  const nav = NAV_SECTIONS[navKey];
  const pathname = usePathname();
  const collapsed = useSyncExternalStore(
    subscribeToCollapsed,
    getCollapsedSnapshot,
    getCollapsedServerSnapshot,
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const [drawerPathname, setDrawerPathname] = useState(pathname);

  const toggleCollapsed = useCallback(() => {
    writeCollapsed(!getCollapsedSnapshot());
  }, []);

  // Route change closes the drawer — otherwise it stays open over the page the
  // user just asked for. Adjusted during render rather than in an effect: the
  // drawer should already be closed in the paint that shows the new route, not
  // opened and then closed a frame later.
  if (drawerPathname !== pathname) {
    setDrawerPathname(pathname);
    setMobileOpen(false);
  }

  const brand = (
    <Link
      href={homeHref}
      className={cn(
        "flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-sidebar-ring/50",
        collapsed && "justify-center",
      )}
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
        <GraduationCapIcon className="size-4.5" />
      </span>
      <span
        className={cn(
          "flex min-w-0 flex-col transition-[opacity,width] duration-150",
          collapsed && "w-0 overflow-hidden opacity-0",
        )}
      >
        <span className="truncate text-sm leading-tight font-semibold">
          Agency Workspace
        </span>
        <span className="truncate text-xs leading-tight text-muted-foreground">
          {workspaceLabel}
        </span>
      </span>
    </Link>
  );

  return (
    <div className="flex min-h-svh w-full">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "sticky top-0 hidden h-svh shrink-0 flex-col gap-5 border-r bg-sidebar px-3 py-4 text-sidebar-foreground transition-[width] duration-200 ease-out md:flex",
          collapsed ? "w-16" : "w-60",
        )}
      >
        {brand}
        <SidebarNav sections={nav} collapsed={collapsed} />
        <div className="mt-auto">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={toggleCollapsed}
                  aria-label={
                    collapsed ? "Expand sidebar" : "Collapse sidebar"
                  }
                  aria-pressed={collapsed}
                  className={cn("text-muted-foreground", collapsed && "mx-auto")}
                >
                  <PanelLeftIcon />
                </Button>
              }
            />
            <TooltipContent side="right">
              {collapsed ? "Expand sidebar" : "Collapse sidebar"}
            </TooltipContent>
          </Tooltip>
        </div>
      </aside>

      {/* Mobile drawer — same nav component, so the two cannot drift. */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 gap-5 p-4 sm:max-w-72">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">
            Move between the sections of the workspace.
          </SheetDescription>
          {brand}
          <SidebarNav sections={nav} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Content column. min-w-0 stops a wide table stretching the whole page. */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur-md supports-backdrop-filter:bg-background/70 sm:px-6">
          <Button
            variant="ghost"
            size="icon-sm"
            className="md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            <MenuIcon />
          </Button>

          <div className="flex flex-1 items-center gap-2">
            <GlobalSearch entries={searchEntries} />
          </div>

          <div className="flex items-center gap-1">
            <ThemeToggle />
            <UserMenu user={user} />
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
          {previewMode ? <p role="status" className="mb-5 rounded-lg border bg-muted px-4 py-3 text-sm text-muted-foreground">Preview workspace · Sample records · Changes are not saved</p> : null}
          {children}
        </main>
      </div>
    </div>
  );
}
