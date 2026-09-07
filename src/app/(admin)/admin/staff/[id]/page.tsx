import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeftIcon,
  BadgeCheckIcon,
  ClockIcon,
  FileTextIcon,
  UsersIcon,
} from "lucide-react";

import { formatDateLong, initials } from "@/lib/format";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/panel";
import { StatTile } from "@/components/dashboard/stat-tile";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { AttentionList } from "@/components/dashboard/attention-list";
import { StudentsTable } from "@/components/students/students-table";
import { getMockActivityForStudents } from "@/lib/mock/activity";
import {
  getMockNeedsAttentionForStaff,
  getMockStaffWorkloadFor,
} from "@/lib/mock/selectors";
import {
  MOCK_NOW,
  getMockStaffMember,
  getMockStudentsForStaff,
} from "@/lib/mock/students";

/**
 * One staff member, as the Admin sees them (PRD §4.1 — monitor staff).
 *
 * This is a monitoring screen, not an account-management screen: nothing here
 * edits, disables or deletes an account. Those are writes through the Supabase
 * Auth admin API with the service-role key, which is server-only hand-written
 * code (CLAUDE.md), and they land in Phase 3.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const staff = await getMockStaffMember(id);

  return { title: staff?.full_name ?? "Staff member not found" };
}

export default async function AdminStaffDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [staff, workload, students, attention] = await Promise.all([
    getMockStaffMember(id),
    getMockStaffWorkloadFor(id),
    getMockStudentsForStaff(id),
    getMockNeedsAttentionForStaff(id),
  ]);

  if (!staff) notFound();

  const activity = await getMockActivityForStudents(
    students.map((student) => student.id),
    8,
  );

  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/admin/staff"
        className="inline-flex w-fit items-center gap-1.5 rounded text-sm text-muted-foreground underline-offset-4 outline-none transition-colors hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <ArrowLeftIcon className="size-3.5" />
        All staff
      </Link>

      <div className="surface-panel flex flex-wrap items-center gap-4 p-5">
        <Avatar size="lg" className="size-14">
          {staff.avatar_url ? <AvatarImage src={staff.avatar_url} alt="" /> : null}
          <AvatarFallback className="text-lg">
            {initials(staff.full_name)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-xl font-semibold tracking-tight">
              {staff.full_name}
            </h1>
            <Badge variant="secondary" className="capitalize">
              {staff.role}
            </Badge>
          </div>
          <p className="truncate text-sm text-muted-foreground">{staff.email}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Account created {formatDateLong(staff.created_at)}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Students"
          value={workload?.studentCount ?? 0}
          hint="Assigned to this staff member."
          icon={UsersIcon}
        />
        <StatTile
          label="Applications"
          value={workload?.applicationCount ?? 0}
          hint="Across all assigned students."
          icon={FileTextIcon}
        />
        <StatTile
          label="Awaiting decision"
          value={workload?.awaitingDecisionCount ?? 0}
          hint="Submitted or under review, no answer yet."
          icon={ClockIcon}
        />
        <StatTile
          label="Offers received"
          value={workload?.acceptedCount ?? 0}
          icon={BadgeCheckIcon}
          tone="success"
        />
      </div>

      <Panel
        title="Needs attention"
        description="Across this caseload only."
      >
        <AttentionList items={attention} limit={5} />
      </Panel>

      <section className="flex flex-col gap-3">
        <div className="space-y-0.5">
          <h2 className="text-sm font-semibold">Assigned students</h2>
          <p className="text-xs text-muted-foreground">
            Rows open the Admin view of the student file.
          </p>
        </div>
        <StudentsTable
          students={students}
          buildHref={(studentId) => `/admin/students/${studentId}`}
          emptyMessage="No students are assigned to this staff member yet."
        />
      </section>

      <Panel
        title="Recent activity"
        description="Changes on this caseload."
      >
        <ActivityFeed events={activity} now={MOCK_NOW.toISOString()} />
      </Panel>
    </div>
  );
}
