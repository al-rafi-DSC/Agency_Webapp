import type { Metadata } from "next";
import { getStudent } from "@/lib/supabase/workspace";
import { renderStudentPage } from "@/lib/workspace/student-page";

export async function generateMetadata({ params }: { params: Promise<{id:string}> }): Promise<Metadata> {
  const student = await getStudent((await params).id, "admin");
  return { title: student?.full_name ?? "Student not found" };
}
export default async function StudentPage({ params }: { params: Promise<{id:string}> }) {
  return renderStudentPage((await params).id, "admin");
}
