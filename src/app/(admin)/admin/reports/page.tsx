import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { TextField } from "@/components/workspace/text-field";
import { MutationForm } from "@/components/workspace/mutation-form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth/session";
import { getReports } from "@/lib/supabase/workspace";
import { createReportAction } from "@/app/workspace/actions";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Yearly summary" };
export default async function ReportsPage() {
  await requireRole(["admin", "superadmin"], { previewAs: "admin" });
  const reports = await getReports();
  return <><PageHeader title="Yearly summary" description="Review worker and student activity for a calendar year, academic year or custom period." />
    <div className="space-y-5"><Panel title="Create a report"><MutationForm action={createReportAction} submitLabel="Create draft report">
      <div className="grid gap-4 md:grid-cols-3"><TextField name="label" label="Report name" required maxLength={120} />
        <TextField name="period_start" label="Start date" type="date" required /><TextField name="period_end" label="End date" type="date" required /></div>
      <p className="text-sm text-muted-foreground">Both dates are included. Reports use UTC. Review a draft before approving its snapshot.</p>
    </MutationForm></Panel>
    <Panel title="Saved reports">{reports.length ? <div className="overflow-x-auto"><Table><TableHeader><TableRow>
      <TableHead>Report</TableHead><TableHead>Period</TableHead><TableHead>Version</TableHead><TableHead>Status</TableHead>
    </TableRow></TableHeader><TableBody>{reports.map((r) => <TableRow key={r.id}>
      <TableCell><Link className="font-medium underline" href={`/admin/reports/${r.id}`}>{r.label}</Link></TableCell>
      <TableCell>{formatDate(r.period_start)} – {formatDate(r.period_end)}</TableCell><TableCell>{r.version}</TableCell><TableCell>{r.approved_at ? "Approved" : "Draft"}</TableCell>
    </TableRow>)}</TableBody></Table></div> : <p className="text-sm text-muted-foreground">No yearly reports yet. Create a draft to review your first summary.</p>}</Panel></div>
  </>;
}
