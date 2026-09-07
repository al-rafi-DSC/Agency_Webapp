import type { Metadata } from "next";
import {
  BadgeCheckIcon,
  FileTextIcon,
  UserPlusIcon,
  UsersIcon,
} from "lucide-react";

import { PageHeader } from "@/components/page-header";
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
import { getMockActivity } from "@/lib/mock/activity";
import {
  getMockDashboardStats,
  getMockNeedsAttention,
  getMockStaffWorkload,
} from "@/lib/mock/selectors";
import { MOCK_NOW } from "@/lib/mock/students";
import { pluralize } from "@/lib/format";

export const metadata: Metadata = { title: "Dashboard" };

/**
 * Admin dashboard — PRD §2: full visibility into every student's status and
 * every staff member's workload, in one place.
 *
 * A Server Component that fetches and hands typed props down. Everything below
 * this line is presentational, so Phase 3 changes only the four `getMock*`
 * calls.
 */
export default async function AdminDashboardPage() {
  const [stats, workload, attention, activity] = await Promise.all([
    getMockDashboardStats(),
    getMockStaffWorkload(),
    getMockNeedsAttention(),
    getMockActivity(8),
  ]);

  const now = MOCK_NOW.toISOString();

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Every student file and every staff caseload, at a glance."
      />

      <div className="flex flex-col gap-5">
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
            hint={`of ${stats.totalApplications} total — submitted or under review`}
            icon={FileTextIcon}
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
            description="Unconfirmed offers, unassigned files, and stalled applications."
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
