import { UserSearchIcon } from "lucide-react";

import { EmptyState } from "@/components/empty-state";

export default function StudentNotFound() {
  return (
    <EmptyState
      icon={UserSearchIcon}
      title="Student file not found"
      description="This file may have been removed, or the link may be out of date."
      actionHref="/admin/students"
      actionLabel="Back to students"
      className="mt-10"
    />
  );
}
