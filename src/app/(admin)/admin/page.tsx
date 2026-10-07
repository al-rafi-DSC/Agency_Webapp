import { Fragment } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangleIcon,
  BadgeCheckIcon,
  BellIcon,
  FileTextIcon,
  FolderPlusIcon,
  UserPlusIcon,
  UsersIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { DashboardHero } from "@/components/dashboard/dashboard-hero";
import { Panel } from "@/components/panel";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { AttentionList } from "@/components/dashboard/attention-list";
import { DistributionBar } from "@/components/dashboard/distribution-bar";
import { StatTile } from "@/components/dashboard/stat-tile";
import { WorkloadList } from "@/components/dashboard/workload-list";
import {
  applicationSegments,
  decisionSegments,
} from "@/components/dashboard/status-segments";
import { StaffRequests } from "@/components/staff/staff-requests";
import { NewStudentFiles } from "@/components/students/new-student-files";
import { MutationForm } from "@/components/workspace/mutation-form";
import { markStudentFilesSeenAction, resolveStaffRegistrationAction } from "@/app/workspace/actions";
import { getActivity, getNewStudentFiles, getStaffRegistrations } from "@/lib/supabase/workspace";
import {
  getDashboardStats,
  getNeedsAttention,
  getStaffWorkload,
} from "@/lib/supabase/workspace";
import { workspaceNow } from "@/lib/supabase/workspace";
import { formatDateLong, pluralize } from "@/lib/format";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Dashboard" };


export default async function AdminDashboardPage() {
  const [user, stats, workload, attention, activity, staffRequests, newFiles] = await Promise.all([
    requireRole(["admin", "superadmin"], { previewAs: "admin", next: "/admin" }),
    getDashboardStats(),
    getStaffWorkload(),
    getNeedsAttention(),
    getActivity(),
    getStaffRegistrations(),
    getNewStudentFiles(),
  ]);

  const now = await workspaceNow();

  return (
    <>
      <div className="flex flex-col gap-6">
        <DashboardHero
          name={user.full_name}
          dateLabel={formatDateLong(now)}
          subtitle="Every student file and every staff caseload, at a glance."
          highlights={[
            { label: "New files", value: newFiles.length, icon: BellIcon },
            { label: "Needs attention", value: attention.length, icon: AlertTriangleIcon },
            { label: "Staff requests", value: staffRequests.length, icon: UserPlusIcon },
          ]}
          actions={
            <>
              <Button
                nativeButton={false}
                className="bg-white text-violet-700 shadow-lg hover:bg-white/90"
                render={
                  <Link href="/admin/students/new">
                    <FolderPlusIcon />
                    Open a student file
                  </Link>
                }
              />
              <Button
                nativeButton={false}
                variant="ghost"
                className="hero-chip text-white hover:bg-white/20 hover:text-white"
                render={<Link href="/admin/applications">View applications</Link>}
              />
            </>
          }
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label="Students"
            value={stats.totalStudents}
            hint={`${pluralize(stats.studentsWithoutApplications, "file")} with no university added yet`}
            icon={UsersIcon}
            href="/admin/students"
            linkLabel="All students"
          />
          <StatTile
            label="Active applications"
            value={stats.activeApplications}
            hint={`of ${stats.totalApplications} total — submitted and awaiting a decision`}
            icon={FileTextIcon}
            tone="info"
            href="/admin/applications"
            linkLabel="All applications"
          />
          <StatTile
            label="Offers received"
            value={stats.acceptedCount}
            hint={`${stats.admissionsConfirmed} confirmed · ${stats.scholarshipsAwarded} scholarships awarded`}
            icon={BadgeCheckIcon}
            tone="success"
          />
          <StatTile
            label="Unassigned files"
            value={stats.unassignedStudents}
            hint={
              stats.unassignedStudents === 0
                ? "Every student has a staff member."
                : "Assignment is manual — no auto-matching in v1."
            }
            icon={UserPlusIcon}
            tone={stats.unassignedStudents > 0 ? "warning" : "default"}
            href="/admin/students?assignment=unassigned"
            linkLabel="Review"
          />
        </div>

        <NewStudentFiles
          files={newFiles}
          action={newFiles.length ? (
            <MutationForm
              action={markStudentFilesSeenAction.bind(null, newFiles[0].student.created_at)}
              submitLabel="Mark as seen"
              variant="outline"
              size="sm"
            />
          ) : null}
        />

        <StaffRequests
          requests={staffRequests}
          actions={Object.fromEntries(
            staffRequests.map((request) => [
              request.id,
              <Fragment key={request.id}>
                {request.has_account ? (
                  <MutationForm
                    action={resolveStaffRegistrationAction.bind(null, request.id, "link")}
                    submitLabel="Use these details"
                    size="sm"
                  />
                ) : null}
                <MutationForm
                  action={resolveStaffRegistrationAction.bind(null, request.id, "dismiss")}
                  submitLabel="Dismiss"
                  variant="outline"
                  size="sm"
                />
              </Fragment>,
            ]),
          )}
        />

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel
            title="Application pipeline"
            description={`Where all ${stats.totalApplications} applications currently sit.`}
          >
            <DistributionBar
              segments={applicationSegments(stats.breakdown)}
              total={stats.totalApplications}
              emptyMessage="No applications have been added yet."
            />
          </Panel>

          <Panel
            title="Decisions"
            description="What the universities have come back with."
          >
            <DistributionBar
              segments={decisionSegments(stats.breakdown)}
              total={stats.totalApplications}
              emptyMessage="No decisions to report yet."
            />
          </Panel>
        </div>

        <div className="grid gap-4 lg:grid-cols-5">
          <Panel
            title="Needs attention"
            description="Unconfirmed offers and files needing an active worker."
            className="lg:col-span-3"
          >
            <AttentionList items={attention} limit={5} />
          </Panel>

          <Panel
            title="Staff workload"
            description="Bars compare against the busiest caseload."
            actionHref="/admin/staff"
            actionLabel="Staff"
            className="lg:col-span-2"
          >
            <WorkloadList rows={workload} />
          </Panel>
        </div>

        <Panel
          title="Recent activity"
          description="The latest changes across every student file."
        >
          <ActivityFeed events={activity} now={now} />
        </Panel>
      </div>
    </>
  );
}
