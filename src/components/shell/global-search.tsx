"use client";

/**
 * Quick-find across whatever the shell was handed.
 *
 * Presentational: it filters an array of entries given to it as props. It does
 * not query anything. When Phase 3 replaces the fixtures, this component is
 * unchanged — the layout above it hands over a different array, and a staff
 * user's array contains only what RLS returned for them.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SearchIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { SearchEntry } from "@/types/ui";

const MAX_RESULTS = 8;

export function GlobalSearch({ entries }: { entries: SearchEntry[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cmd/Ctrl+K is the near-universal shortcut for this control; users try it
  // before they try clicking.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((previous) => !previous);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const pool = needle
      ? entries.filter(
          (entry) =>
            entry.label.toLowerCase().includes(needle) ||
            entry.sublabel.toLowerCase().includes(needle),
        )
      : entries;
    return pool.slice(0, MAX_RESULTS);
  }, [entries, query]);

  function go(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setQuery("");
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="w-full max-w-64 justify-start gap-2 text-muted-foreground sm:w-64"
      >
        <SearchIcon className="size-3.5" />
        <span className="truncate">Search students…</span>
        <kbd className="ml-auto hidden rounded border bg-muted px-1 font-mono text-[0.625rem] text-muted-foreground sm:inline">
          ⌘K
        </kbd>
      </Button>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="top-24 max-w-lg translate-y-0 gap-0 p-0 sm:max-w-lg"
          initialFocus={inputRef}
        >
          <DialogTitle className="sr-only">Search students</DialogTitle>

          <div className="flex items-center gap-2 border-b px-3 py-2">
            <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                // Reset the highlight here rather than in an effect on
                // `query` — the list changed because of this keystroke, so
                // this is where the selection stops being meaningful.
                setHighlighted(0);
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setHighlighted((i) => Math.min(i + 1, results.length - 1));
                } else if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setHighlighted((i) => Math.max(i - 1, 0));
                } else if (event.key === "Enter" && results[highlighted]) {
                  event.preventDefault();
                  go(results[highlighted].href);
                }
              }}
              placeholder="Search by student or university…"
              aria-label="Search"
              className="h-9 border-0 shadow-none focus-visible:ring-0 dark:bg-transparent"
            />
          </div>

          <div className="max-h-80 overflow-y-auto p-1.5">
            {results.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                Nothing matches “{query.trim()}”.
              </p>
            ) : (
              <ul className="flex flex-col">
                {results.map((entry, index) => (
                  <li key={entry.id}>
                    <button
                      type="button"
                      onClick={() => go(entry.href)}
                      onMouseEnter={() => setHighlighted(index)}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 rounded-md px-2.5 py-2 text-left transition-colors",
                        index === highlighted
                          ? "bg-accent text-accent-foreground"
                          : "text-foreground",
                      )}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">
                          {entry.label}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {entry.sublabel}
                        </span>
                      </span>
                      <span className="shrink-0 text-[0.6875rem] text-muted-foreground uppercase">
                        {entry.group}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
