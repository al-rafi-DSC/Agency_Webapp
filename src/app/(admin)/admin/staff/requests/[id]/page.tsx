import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { resolveStaffRegistrationAction } from "@/app/workspace/actions";
import { PageHeader } from "@/components/page-header";
import { StaffRequestDetail } from "@/components/staff/staff-request-detail";
import { MutationForm } from "@/components/workspace/mutation-form";
import { requireRole } from "@/lib/auth/session";
import { getStaffRegistrations } from "@/lib/supabase/workspace";

export const metadata: Metadata = { title: "Staff request" };

export default async function StaffRequestPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["admin", "superadmin"], { previewAs: "admin" });
  const { id } = await params;
  const request = (await getStaffRegistrations()).find((r) => r.id === id);
  // Only waiting requests have a page. Once one is used or dismissed — including
  // from the buttons below — there is nothing left to show here.
  if (!request) redirect("/admin");

  return (
    <div className="space-y-5">
      <Link href="/admin" className="text-sm underline">Dashboard</Link>
      <PageHeader title={request.full_name} description="New staff request — not an account yet." />
      <StaffRequestDetail
        request={request}
        actions={
          <>
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
          </>
        }
      />
    </div>
  );
}
