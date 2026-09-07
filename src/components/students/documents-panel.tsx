/**
 * Documents on a student file — a UI SHELL, deliberately non-functional.
 *
 * Uploading means Supabase Storage plus a Server Action, both hand-written and
 * both Phase 3. Rather than draw a working-looking dropzone that silently drops
 * files, this panel states what it is and carries the one constraint that will
 * actually shape the feature.
 *
 * ── The constraint worth reading ─────────────────────────────────────────────
 * The Supabase free tier gives 1GB of file storage against 500MB of database
 * (CLAUDE.md). Student photos and scanned passports/transcripts will hit the
 * storage ceiling long before the database fills. Whatever gets built here
 * needs a size limit and a retention answer, not an unbounded uploader.
 */

import { HardDriveIcon, PaperclipIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { EmptyState } from "@/components/empty-state";

export function DocumentsPanel() {
  return (
    <div className="flex flex-col gap-4">
      <EmptyState
        icon={PaperclipIcon}
        title="No documents yet"
        description="Transcripts, passports and offer letters will live here."
        className="border-0 py-6"
      />

      <Alert>
        <HardDriveIcon />
        <AlertTitle>Not wired up yet</AlertTitle>
        <AlertDescription>
          Uploads need Supabase Storage and a Server Action, both of which are
          hand-written in Phase 3. Worth deciding first: a per-file size cap and
          what happens to documents after a student enrolls — the free tier
          gives 1GB of storage, and scans fill it faster than anything else.
        </AlertDescription>
      </Alert>
    </div>
  );
}
