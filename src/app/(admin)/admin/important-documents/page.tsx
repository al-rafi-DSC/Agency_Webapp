import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { ImportantDocumentsList } from "@/components/documents/important-documents-list";
import { ArchivedList } from "@/components/workspace/archived-list";
import { MutationForm } from "@/components/workspace/mutation-form";
import { TextField } from "@/components/workspace/text-field";
import { getImportantDocuments } from "@/lib/supabase/workspace";
import { archiveRecordAction, saveImportantDocumentAction } from "@/app/workspace/actions";
import { formatDate } from "@/lib/format";
import type { ImportantDocument } from "@/types/workspace";

export const metadata: Metadata = { title: "Important documents" };

function DocumentFields({ doc, prefix }: { doc?: ImportantDocument; prefix: string }) {
  return (
    <div className="grid gap-4 sm:grid-cols-[1fr_1fr_7rem]">
      <TextField name="title" label="Name" value={doc?.title ?? ""} required minLength={1} maxLength={200} prefix={prefix} />
      <TextField name="url" label="Google Drive link (HTTPS)" value={doc?.url ?? ""} type="url" required maxLength={2048} prefix={prefix} />
      <TextField name="sort_order" label="Position" value={String(doc?.sort_order ?? 0)} type="number" maxLength={4} prefix={prefix} />
    </div>
  );
}


export default async function AdminImportantDocumentsPage() {
  const all = await getImportantDocuments();
  const documents = all.filter((d) => !d.archived_at);
  const archived = all.filter((d) => d.archived_at);
  const archiveButton = (id: string, archive: boolean, label: string) => (
    <MutationForm action={archiveRecordAction.bind(null, "important_document", id, archive)} submitLabel={label} variant="outline" size="sm" />
  );

  return (
    <>
      <PageHeader
        title="Important documents"
        description="Shared agency files. Every worker sees this list and opens each file in Google Drive. Make sure the Drive file is shared with them."
      />

      <div className="max-w-3xl space-y-5">
        <Panel title="Documents" description="Lower positions are listed first.">
          <ImportantDocumentsList
            documents={documents}
            emptyDescription="Add the first document below."
            controls={Object.fromEntries(documents.map((doc) => [doc.id, (
              <details key={doc.id} className="rounded-lg border px-4 py-3">
                <summary className="cursor-pointer text-sm text-muted-foreground">Edit or archive</summary>
                <div className="mt-3 space-y-3">
                  <MutationForm action={saveImportantDocumentAction.bind(null, doc.id)} submitLabel="Save document">
                    <DocumentFields doc={doc} prefix={`doc-${doc.id}`} />
                  </MutationForm>
                  {archiveButton(doc.id, true, "Archive document")}
                </div>
              </details>
            )]))}
          />
        </Panel>

        <Panel title="Add a document">
          <MutationForm action={saveImportantDocumentAction.bind(null, null)} submitLabel="Add document">
            <DocumentFields prefix="new-doc" />
          </MutationForm>
        </Panel>

        <ArchivedList title="Archived documents" items={archived.map((doc) => ({
          id: doc.id, label: doc.title,
          detail: doc.archived_at ? `Archived ${formatDate(doc.archived_at)} · hidden from workers` : "Archived",
          action: archiveButton(doc.id, false, "Restore"),
        }))} />
      </div>
    </>
  );
}
