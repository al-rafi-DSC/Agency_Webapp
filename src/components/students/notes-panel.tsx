"use client";

/**
 * Notes on a student file, with their priority.
 *
 * Renders the notes handed down by the server; the only client state is the
 * filter. Unresolved Urgent notes come first, then unresolved Moderate, then
 * everything else newest first. Controls for each note (resolve, archive) are
 * built by the page and passed in by note id.
 */

import { useState, type ReactNode } from "react";
import { CheckCircle2Icon, MessageSquareIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatDateTime, initials } from "@/lib/format";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { NotePriorityBadge } from "@/components/students/status-badge";
import type { StudentNote } from "@/types/ui";

const FILTERS = { all: "All", urgent: "Urgent", moderate: "Moderate", resolved: "Resolved" } as const;
type Filter = keyof typeof FILTERS;

const open = (note: StudentNote) => (note.priority ?? "normal") !== "normal" && !note.resolved_at;
const rank = (note: StudentNote) => !open(note) ? 2 : note.priority === "urgent" ? 0 : 1;
const matches = (note: StudentNote, filter: Filter) =>
  filter === "all" ? true : filter === "resolved" ? Boolean(note.resolved_at) : open(note) && note.priority === filter;

export function NotesPanel({ notes, actions = {} }: { notes: StudentNote[]; actions?: Record<string, ReactNode> }) {
  const [filter, setFilter] = useState<Filter>("all");

  if (notes.length === 0) {
    return (
      <EmptyState
        icon={MessageSquareIcon}
        title="No notes yet"
        description="Add the first note to this student file."
        className="border-0 py-6"
      />
    );
  }

  const shown = notes.filter((note) => matches(note, filter))
    .sort((a, b) => rank(a) - rank(b) || b.created_at.localeCompare(a.created_at));

  return (
    <div className="flex flex-col gap-4">
      <div role="group" aria-label="Filter notes" className="flex flex-wrap gap-2">
        {(Object.keys(FILTERS) as Filter[]).map((key) => (
          <Button key={key} size="sm" variant={filter === key ? "default" : "outline"} aria-pressed={filter === key} onClick={() => setFilter(key)}>
            {FILTERS[key]}
            <span className="ml-1 tabular-nums opacity-70">{notes.filter((note) => matches(note, key)).length}</span>
          </Button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="text-sm text-muted-foreground">No {FILTERS[filter].toLowerCase()} notes.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {shown.map((note) => (
            <li key={note.id} className={cn("flex gap-3 rounded-lg", open(note) && note.priority === "urgent" && "bg-destructive/5 p-3 ring-1 ring-destructive/20")}>
              <Avatar size="sm">
                <AvatarFallback>{initials(note.author_name)}</AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1 space-y-1">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-sm font-medium">{note.author_name}</span>
                  <time dateTime={note.created_at} className="text-xs text-muted-foreground">
                    {formatDateTime(note.created_at)}
                  </time>
                  {note.priority && note.priority !== "normal" ? <NotePriorityBadge priority={note.priority} resolved={Boolean(note.resolved_at)} /> : null}
                </p>
                <p className="text-sm leading-relaxed break-words whitespace-pre-line text-muted-foreground">
                  {note.body}
                </p>
                {note.resolved_at ? (
                  <p className="flex items-center gap-1 text-xs text-success-soft-foreground">
                    <CheckCircle2Icon className="size-3" />
                    Resolved{note.resolved_by_name ? ` by ${note.resolved_by_name}` : ""} on {formatDateTime(note.resolved_at)}
                  </p>
                ) : null}
                {actions[note.id] ? <div className="flex flex-wrap gap-2 pt-1">{actions[note.id]}</div> : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
