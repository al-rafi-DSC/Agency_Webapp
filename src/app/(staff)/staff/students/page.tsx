import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { StudentsExplorer } from "@/components/students/students-explorer";
import {
  MOCK_CURRENT_STAFF_ID,
  getMockStudentsForStaff,
} from "@/lib/mock/students";

export const metadata: Metadata = { title: "My students" };

/**
 * A staff member's students (PRD §4.2).
 *
 * Reuses the Admin explorer with `showAssignedStaff` off and no staff list —
 * the assigned-to column would say the same name on every row. There is no
 * "open student file" action: creating students is the Admin's job (PRD §4.1).
 */
export default async function StaffStudentsPage() {
  const students = await getMockStudentsForStaff(MOCK_CURRENT_STAFF_ID);

  return (
    <>
      <PageHeader
        title="My students"
        description="Every student assigned to you, with where their applications stand."
      />

      <StudentsExplorer
        students={students}
        studentBasePath="/staff/students"
        emptyTitle="No students assigned to you yet"
        emptyDescription="The Admin assigns student files. Once one is assigned it appears here."
      />
    </>
  );
}
