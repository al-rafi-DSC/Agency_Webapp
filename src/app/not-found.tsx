import Link from "next/link";
import { CompassIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16 sm:px-6">
      <div className="w-full max-w-sm text-center">
        <span className="mx-auto mb-5 flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <CompassIcon className="size-5" />
        </span>
        <h1 className="text-lg font-semibold tracking-tight">Page not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          That address does not match anything in this workspace.
        </p>
        <Button
          size="sm"
          className="mt-6"
          nativeButton={false}
          render={<Link href="/">Back to start</Link>}
        />
      </div>
    </main>
  );
}
