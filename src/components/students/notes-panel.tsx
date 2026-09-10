/**
 * Notes on a student file.
 *
 * Renders the notes handed down by the server. The surrounding student page
 * supplies a separate Server Action form for adding notes.
 */

import type { ReactNode } from "react";
import { MessageSquareIcon } from "lucide-react";

import { formatDateTime, initials } from "@/lib/format";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmptyState } from "@/components/empty-state";
import type { StudentNote } from "@/types/ui";

export function NotesPanel({ notes, renderActions }: { notes: StudentNote[]; renderActions?: (note: StudentNote) => ReactNode }) {
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

  return (
    <ul className="flex flex-col gap-4">
      {notes.map((note) => (
        <li key={note.id} className="flex gap-3">
          <Avatar size="sm">
            <AvatarFallback>{initials(note.author_name)}</AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1 space-y-1">
            <p className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-sm font-medium">{note.author_name}</span>
              <time
                dateTime={note.created_at}
                className="text-xs text-muted-foreground"
              >
                {formatDateTime(note.created_at)}
              </time>
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {note.body}
            </p>
            {renderActions?.(note)}
          </div>
        </li>
      ))}
    </ul>
  );
}
