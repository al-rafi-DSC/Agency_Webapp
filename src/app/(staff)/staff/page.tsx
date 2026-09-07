import type { Metadata } from "next";
import { BadgeCheckIcon, ClockIcon, FileTextIcon, UsersIcon } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { AttentionList } from "@/components/dashboard/attention-list";
import { DistributionBar } from "@/components/dashboard/distribution-bar";
import { StatTile } from "@/components/dashboard/stat-tile";
import {
  applicationSegments,
  decisionSegments,
} from "@/components/dashboard/status-segments";
import { getMockActivityForStudents } from "@/lib/mock/activity";
import {
  getMockDashboardStatsForStaff,
  getMockNeedsAttentionForStaff,
} from "@/lib/mock/selectors";
import {
  MOCK_CURRENT_STAFF_ID,
  MOCK_NOW,
  getMockStudentsForStaff,
} from "@/lib/mock/students";
import { pluralize } from "@/lib/format";

export const metadata: Metadata = { title: "My dashboard" };

/**
 * Staff dashboard — the same shape as the Admin one, over one caseload
 * (PRD §4.2).
 *
 * Every figure is computed from the students this account was given. In Phase 3
 * that set comes back from an unfiltered query that RLS narrows, so these
 * numbers cannot silently include somebody else's student.
 */
export default async function StaffDashboardPage() {
  const [stats, attention, students] = await Promise.all([
    getMockDashboardStatsForStaff(MOCK_CURRENT_STAFF_ID),
    getMockNeedsAttentionForStaff(MOCK_CURRENT_STAFF_ID),
    getMockStudentsForStaff(MOCK_CURRENT_STAFF_ID),
  ]);

  const activity = await getMockActivityForStudents(
    students.map((student) => student.id),
    8,
  );

  const awaitingDecision = students
    .flatMap((student) => student.applications)
    .filter(
      (application) =>
        application.decision_status === "pending" &&
        (application.application_status === "submitted" ||
          application.application_status === "under_review"),
    ).length;

  return (
    <>
      <PageHeader
        title="My dashboard"
        description="Your assigned students and where each application stands."
      />

      <div className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label="My students"
            value={stats.totalStudents}
            hint={`${pluralize(stats.studentsWithoutApplications, "file")} with no university added yet`}
            icon={UsersIcon}
            href="/staff/students"
            linkLabel="My students"
          />
          <StatTile
            label="Applications"
            value={stats.totalApplications}
            hint={`${stats.activeApplications} submitted or under review`}
            icon={FileTextIcon}
          />
          <StatTile
            label="Awaiting decision"
            value={awaitingDecision}
            hint="Sent off, no answer back yet."
            icon={ClockIcon}
          />
          <StatTile
            label="Offers received"
            value={stats.acceptedCount}
            hint={`${stats.admissionsConfirmed} confirmed · ${stats.scholarshipsAwarded} scholarships awarded`}
            icon={BadgeCheckIcon}
            tone="success"
          />
        </div>

        <Panel
          title="Needs attention"
          description="Unconfirmed offers and applications that have not moved."
        >
          <AttentionList
            items={attention}
            buildHref={(studentId) => `/staff/students/${studentId}`}
          />
        </Panel>

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel
            title="My pipeline"
            description={`Where your ${stats.totalApplications} applications sit.`}
          >
            <DistributionBar
              segments={applicationSegments(stats.breakdown)}
              total={stats.totalApplications}
              emptyMessage="No applications on your caseload yet."
            />
          </Panel>

          <Panel title="Decisions" description="What has come back so far.">
            <DistributionBar
              segments={decisionSegments(stats.breakdown)}
              total={stats.totalApplications}
              emptyMessage="No decisions on your caseload yet."
            />
          </Panel>
        </div>

        <Panel
          title="Recent activity"
          description="Changes across your student files."
        >
          <ActivityFeed
            events={activity}
            now={MOCK_NOW.toISOString()}
            buildHref={(studentId) => `/staff/students/${studentId}`}
          />
        </Panel>
      </div>
    </>
  );
}
