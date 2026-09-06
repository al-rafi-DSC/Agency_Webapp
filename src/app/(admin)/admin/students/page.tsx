import { PageHeader } from "@/components/page-header";
import { StudentsTable } from "@/components/students/students-table";
import { getMockStudents } from "@/lib/mock/students";

/**
 * ★ REFERENCE SCREEN — Admin students pipeline (PRD §6, flow 4).
 *
 * The shape every data screen should follow:
 *
 *   Server Component  →  fetch  →  pass typed props to a presentational component
 *
 * Right now the fetch is `getMockStudents()`. In Phase 3 that single line
 * becomes a Supabase query through `@/lib/supabase/server`, which runs as the
 * logged-in user so Row Level Security decides which rows come back. Nothing
 * below this line has to change — that is the point of keeping the components
 * presentational.
 */
export default async function AdminStudentsPage() {
  const students = await getMockStudents();

  return (
    <>
      <PageHeader
        title="Students"
        description="Every student file, with the staff member assigned and current application status."
      />
      <StudentsTable
        students={students}
        showAssignedStaff
        emptyMessage="No student files opened yet."
      />
    </>
  );
}
