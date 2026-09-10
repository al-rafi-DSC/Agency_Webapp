import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { MutationForm } from "@/components/workspace/mutation-form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth/session";
import { getReport } from "@/lib/supabase/workspace";
import { approveReportAction, createReportAction, refreshReportAction } from "@/app/workspace/actions";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Yearly report" };
export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["admin", "superadmin"], { previewAs: "admin" });
  const report = await getReport((await params).id);
  if (!report) notFound();
  const totals = report.payload;
  const metrics = [["New student files", totals.new_students], ["Unique students handled", totals.students_handled],
    ["Applications submitted", totals.applications_submitted], ["Offers received", totals.offers_received],
    ["Rejections received", totals.rejections_received], ["Admissions confirmed", totals.admissions_confirmed], ["Scholarships awarded", totals.scholarships_awarded]] as const;
  return <div className="space-y-5"><Link href="/admin/reports" className="text-sm underline">All yearly reports</Link>
    <PageHeader title={report.label} description={`${formatDate(report.period_start)} – ${formatDate(report.period_end)} · Version ${report.version} · ${report.approved_at ? "Approved" : "Draft"}`} />
    <p className="text-sm text-muted-foreground">Generated {new Date(report.generated_at).toLocaleString("en-GB", { timeZone: "UTC" })} UTC{report.approved_at ? ` · Approved ${formatDate(report.approved_at)}` : " · Refresh to include changes recorded since this snapshot."}</p>
    <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(([label, count]) => <div key={label} className="surface-panel p-5"><dt className="text-sm text-muted-foreground">{label}</dt><dd className="mt-2 text-3xl font-semibold tabular-nums">{count}</dd></div>)}</dl>
    <Panel title="Workers"><p className="mb-4 text-sm text-muted-foreground">Shared students can appear for several workers; the company total counts each student once. Application updates show activity, not credit for outcomes.</p>
      {totals.workers.length ? <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Worker</TableHead><TableHead>Students handled</TableHead><TableHead>Applications updated</TableHead></TableRow></TableHeader>
        <TableBody>{totals.workers.map((w) => <TableRow key={w.id}><TableCell>{w.full_name}</TableCell><TableCell>{w.students_handled}</TableCell><TableCell>{w.applications_updated}</TableCell></TableRow>)}</TableBody></Table></div>
        : <p className="text-sm text-muted-foreground">No workers in this report.</p>}
    </Panel>
    <Panel title="Universities">{totals.universities.length ? <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>University</TableHead><TableHead>Submitted</TableHead><TableHead>Offers</TableHead><TableHead>Rejections</TableHead></TableRow></TableHeader>
      <TableBody>{totals.universities.map((u) => <TableRow key={u.university_name}><TableCell>{u.university_name}</TableCell><TableCell>{u.applications_submitted}</TableCell><TableCell>{u.offers_received}</TableCell><TableCell>{u.rejections_received}</TableCell></TableRow>)}</TableBody></Table></div>
      : <p className="text-sm text-muted-foreground">No university application activity in this period.</p>}</Panel>
    <p className="text-sm text-muted-foreground">Milestones count each application once per category in this period, using when the change was recorded. An offer received in January belongs to that year even if the application was submitted in December.</p>
    <div className="flex flex-wrap items-start gap-4">{!report.approved_at ? <>
      <MutationForm action={refreshReportAction.bind(null, report.id)} submitLabel="Refresh totals" />
      <MutationForm action={approveReportAction.bind(null, report.id, report.generated_at)} submitLabel="Approve this snapshot" />
    </> : null}<MutationForm action={createReportAction} submitLabel="Create a new version">
      <input type="hidden" name="label" value={report.label} /><input type="hidden" name="period_start" value={report.period_start} /><input type="hidden" name="period_end" value={report.period_end} />
    </MutationForm></div>
  </div>;
}
