/**
 * The Closed files page: every closed student file the viewer can read.
 *
 * Presentational. The list arrives already scoped by RLS, so staff only ever
 * see their own closed files. Opening a row goes to the read-only student
 * page, where an admin can reopen it.
 */

import Link from "next/link";
import { FolderClosedIcon } from "lucide-react";

import { formatDate } from "@/lib/format";
import { EmptyState } from "@/components/empty-state";
import { Panel } from "@/components/panel";
import { assignedWorkers } from "@/types/db";
import type { ClosedStudentFile } from "@/types/workspace";

export function ClosedFilesList({
  files,
  studentBasePath,
  emptyDescription,
}: {
  files: ClosedStudentFile[];
  studentBasePath: string;
  emptyDescription: string;
}) {
  if (files.length === 0) {
    return <EmptyState icon={FolderClosedIcon} title="No closed files" description={emptyDescription} />;
  }

  return (
    <Panel
      title={files.length === 1 ? "1 closed file" : `${files.length} closed files`}
      description="Read-only. Most recently closed first."
    >
      <ul className="divide-y">
        {files.map(({ student, closed_by_name }) => {
          const workers = assignedWorkers(student);
          return (
            <li key={student.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
              <span
                aria-hidden
                className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
              >
                <FolderClosedIcon className="size-3.5" />
              </span>
              <div className="min-w-0 space-y-0.5">
                <Link
                  href={`${studentBasePath}/${student.id}`}
                  className="rounded text-sm font-medium break-words underline underline-offset-4 outline-none hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {student.full_name}
                </Link>
                <p className="text-sm break-words text-muted-foreground">
                  <span className="text-foreground/80">Reason:</span> {student.close_reason || "No reason recorded"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Closed {formatDate(student.closed_at!)}
                  {closed_by_name ? ` by ${closed_by_name}` : ""}
                  {" · "}
                  {workers.length ? `Assigned to ${workers.map((w) => w.full_name).join(", ")}` : "Unassigned"}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
