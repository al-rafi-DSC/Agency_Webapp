import { UserSearchIcon } from "lucide-react";

import { EmptyState } from "@/components/empty-state";

/**
 * Shown both when a student file does not exist and when it is not assigned to
 * this account. The two cases look identical on purpose: a different message
 * for "exists but not yours" would confirm that a given student exists.
 */
export default function StaffStudentNotFound() {
  return (
    <EmptyState
      icon={UserSearchIcon}
      title="Student file not available"
      description="This file is not assigned to you, or the link is out of date. Ask the Admin if you think it should be yours."
      actionHref="/staff/students"
      actionLabel="Back to my students"
      className="mt-10"
    />
  );
}
