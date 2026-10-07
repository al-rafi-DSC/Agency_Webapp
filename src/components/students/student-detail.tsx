/**
 * The student file screen, shared by the Admin and Staff route trees.
 *
 * One component serves both roles. The differences are passed in — where "back"
 * goes, and whether a reassign control is supplied — because they are routing
 * and presentation. What a role may actually read or write is a database
 * policy, not a prop (PRD §7).
 *
 * This is a Server Component. `Tabs` is a Client Component, but its panels are
 * passed to it as children, so everything inside them is still rendered on the
 * server: only the tab-switching itself ships JavaScript.
 */

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeftIcon, GraduationCapIcon } from "lucide-react";

import { pluralize } from "@/lib/format";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/empty-state";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { ApplicationCard } from "@/components/students/application-card";
import { DocumentsPanel } from "@/components/students/documents-panel";
import { NotesPanel } from "@/components/students/notes-panel";
import { StudentProfileHeader } from "@/components/students/student-profile-header";
import type { StudentWithApplications } from "@/types/db";
import type { ActivityEvent, StudentNote } from "@/types/ui";

export function StudentDetail({
  student,
  notes,
  activity,
  now,
  backHref,
  backLabel,
  noticeSlot,
  assignSlot,
  buildStudentHref,
  detailsSlot,
  applicationsSlot,
  notesSlot,
  documentsSlot,
}: {
  student: StudentWithApplications;
  notes: StudentNote[];
  activity: ActivityEvent[];
  /** One fixed instant, so relative times match between server and client. */
  now: string;
  backHref: string;
  backLabel: string;
  /** Shown above the profile header, e.g. the archived-file notice. */
  noticeSlot?: ReactNode;
  assignSlot?: ReactNode;
  buildStudentHref: (studentId: string) => string;
  detailsSlot?: ReactNode;
  applicationsSlot?: ReactNode;
  notesSlot?: ReactNode;
  documentsSlot?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5">
      <Link
        href={backHref}
        className="inline-flex w-fit items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-sm font-medium text-muted-foreground shadow-sm outline-none transition-colors hover:border-primary/40 hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <ArrowLeftIcon className="size-3.5" />
        {backLabel}
      </Link>

      {noticeSlot}

      <StudentProfileHeader student={student} assignSlot={assignSlot} />

      <Tabs defaultValue="applications" className="gap-5">
        <TabsList className="h-auto! w-full justify-start gap-1 overflow-x-auto rounded-full! border bg-card p-1! shadow-sm sm:w-fit">
          {detailsSlot ? <TabsTrigger value="details" className="h-auto! rounded-full! px-4 py-1.5 data-active:bg-gradient-to-r! data-active:from-violet-600 data-active:to-fuchsia-600 data-active:text-white! data-active:shadow-md data-active:shadow-violet-500/30 data-active:border-transparent!">Details</TabsTrigger> : null}
          <TabsTrigger value="applications" className="h-auto! rounded-full! px-4 py-1.5 data-active:bg-gradient-to-r! data-active:from-violet-600 data-active:to-fuchsia-600 data-active:text-white! data-active:shadow-md data-active:shadow-violet-500/30 data-active:border-transparent!">
            Applications
            <span className="ml-1 rounded-full bg-foreground/10 px-1.5 text-[0.6875rem] tabular-nums">
              {student.applications.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="activity" className="h-auto! rounded-full! px-4 py-1.5 data-active:bg-gradient-to-r! data-active:from-violet-600 data-active:to-fuchsia-600 data-active:text-white! data-active:shadow-md data-active:shadow-violet-500/30 data-active:border-transparent!">Activity</TabsTrigger>
          <TabsTrigger value="notes" className="h-auto! rounded-full! px-4 py-1.5 data-active:bg-gradient-to-r! data-active:from-violet-600 data-active:to-fuchsia-600 data-active:text-white! data-active:shadow-md data-active:shadow-violet-500/30 data-active:border-transparent!">
            Notes
            <span className="ml-1 rounded-full bg-foreground/10 px-1.5 text-[0.6875rem] tabular-nums">
              {notes.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="h-auto! rounded-full! px-4 py-1.5 data-active:bg-gradient-to-r! data-active:from-violet-600 data-active:to-fuchsia-600 data-active:text-white! data-active:shadow-md data-active:shadow-violet-500/30 data-active:border-transparent!">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="applications" className="flex flex-col gap-3">
          {applicationsSlot ?? (student.applications.length === 0 ? (
            <EmptyState
              icon={GraduationCapIcon}
              title="No universities added yet"
              description="Each university this student applies to gets its own entry, with its own application, decision and scholarship status."
            />
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                {pluralize(
                  student.applications.length,
                  "university application",
                  "university applications",
                )}
                , each tracked independently.
              </p>
              <div className="grid gap-3 xl:grid-cols-2">
                {student.applications.map((application) => (
                  <ApplicationCard
                    key={application.id}
                    application={application}
                  />
                ))}
              </div>
            </>
          ))}
        </TabsContent>

        {detailsSlot ? <TabsContent value="details">{detailsSlot}</TabsContent> : null}

        <TabsContent value="activity">
          <div className="surface-panel p-5">
            <ActivityFeed
              events={activity}
              now={now}
              buildHref={buildStudentHref}
            />
          </div>
        </TabsContent>

        <TabsContent value="notes">
          <div className="surface-panel p-5">
            {notesSlot ?? <NotesPanel notes={notes} />}
          </div>
        </TabsContent>

        <TabsContent value="documents">
          <div className="surface-panel p-5">
            {documentsSlot ?? <DocumentsPanel />}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
