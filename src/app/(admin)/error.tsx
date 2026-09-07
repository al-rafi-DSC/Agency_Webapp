"use client";

import { ErrorPanel } from "@/components/error-panel";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorPanel
      digest={error.digest}
      reset={reset}
      description="This screen could not be loaded. Trying again is safe — nothing was changed."
    />
  );
}
