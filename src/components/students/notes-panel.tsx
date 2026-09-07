/**
 * Notes on a student file.
 *
 * ⚠ Notes are a UI FIXTURE. `PRD.md` §5 defines no notes table — this panel
 * exists to put the question in front of the owner ("do you want free-text
 * notes on a file, and who should see them?") rather than to assume the answer.
 * See `src/types/ui.ts`. Do not write a migration from this.
 *
 * Read-only: composing a note is a write, and writes go through a Server Action
 * that is hand-written in Phase 3.
 */

import { MessageSquareIcon } from "lucide-react";

import { formatDateTime, initials } from "@/lib/format";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmptyState } from "@/components/empty-state";
import type { StudentNote } from "@/types/ui";

export function NotesPanel({ notes }: { notes: StudentNote[] }) {
  if (notes.length === 0) {
    return (
      <EmptyState
        icon={MessageSquareIcon}
        title="No notes yet"
        description="Notes are read-only in this build — adding one needs the Server Action from Phase 3."
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
          </div>
        </li>
      ))}
    </ul>
  );
}
