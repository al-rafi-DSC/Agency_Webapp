import { CopyLinkField } from "@/components/workspace/copy-link-field";

/** The signed-in worker's Main Drive Link. Read-only here: only an Admin sets it, on the Workers page. */
export function MainDriveLink({ href }: { href: string | null | undefined }) {
  return (
    <div className="surface-panel p-4">
      <CopyLinkField id="main-drive-link" label="Main Drive Link" href={href}
        hint="Given by the Admin. Only an Admin can change it." emptyText="Not added yet. The Admin adds it." />
    </div>
  );
}
