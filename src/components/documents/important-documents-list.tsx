/**
 * The Important documents list — shared agency files opened in Google Drive.
 *
 * Presentational. Admin edit/archive controls are supplied by the page per
 * document through `controls`; staff pages pass none.
 */

import type { ReactNode } from "react";
import { ExternalLinkIcon, FileTextIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import type { ImportantDocument } from "@/types/workspace";

export function ImportantDocumentsList({ documents, controls = {}, emptyDescription }: {
  documents: ImportantDocument[];
  controls?: Record<string, ReactNode>;
  emptyDescription: string;
}) {
  if (!documents.length) return <EmptyState icon={FileTextIcon} title="No documents yet" description={emptyDescription} />;
  return <ul className="divide-y">{documents.map((doc) => <li key={doc.id} className="space-y-3 py-3 first:pt-0 last:pb-0">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <FileTextIcon className="size-4" />
        </span>
        <p className="min-w-0 break-words text-sm font-medium">{doc.title}</p>
      </div>
      <Button nativeButton={false} variant="outline" size="sm" render={<a href={doc.url} target="_blank" rel="noopener noreferrer">
        <ExternalLinkIcon /> Open</a>} />
    </div>
    {controls[doc.id]}
  </li>)}</ul>;
}
