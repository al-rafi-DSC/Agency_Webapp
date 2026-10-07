import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { ImportantDocumentsList } from "@/components/documents/important-documents-list";
import { getImportantDocuments } from "@/lib/supabase/workspace";

export const metadata: Metadata = { title: "Important documents" };


export default async function StaffImportantDocumentsPage() {
  // RLS returns only open documents to staff.
  const documents = (await getImportantDocuments()).filter((d) => !d.archived_at);

  return (
    <>
      <PageHeader
        title="Important documents"
        description="Shared agency files. Each one opens in Google Drive."
      />

      <Panel title="Documents" className="max-w-3xl">
        <ImportantDocumentsList documents={documents} emptyDescription="The Admin hasn't added any documents yet." />
      </Panel>
    </>
  );
}
