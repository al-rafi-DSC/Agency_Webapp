import { UserSearchIcon } from "lucide-react";

import { EmptyState } from "@/components/empty-state";

export default function StaffNotFound() {
  return (
    <EmptyState
      icon={UserSearchIcon}
      title="Staff member not found"
      description="This account may have been removed, or the link may be out of date."
      actionHref="/admin/staff"
      actionLabel="Back to staff"
      className="mt-10"
    />
  );
}
