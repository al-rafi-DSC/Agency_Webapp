/**
 * One waiting staff request, in full.
 *
 * Presentational. Everything the person typed into the staff details form,
 * plus what the Admin does next. The controls are supplied by the page.
 */

import type { ReactNode } from "react";

import { formatDateTime } from "@/lib/format";
import { Panel } from "@/components/panel";
import { GENDER_LABELS, type StaffRegistration } from "@/types/workspace";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm break-words whitespace-pre-line">{children}</dd>
    </div>
  );
}

export function StaffRequestDetail({
  request,
  actions,
}: {
  request: StaffRegistration;
  actions: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5">
      <Panel title="Submitted details" description={`Sent ${formatDateTime(request.submitted_at)} UTC`}>
        <dl className="grid gap-5 sm:grid-cols-2">
          <Field label="Name">{request.full_name}</Field>
          <Field label="Phone number">
            <a href={`tel:${request.phone}`} className="underline underline-offset-4">
              {request.phone}
            </a>
          </Field>
          <Field label="Gmail">
            <a href={`mailto:${request.email}`} className="break-all underline underline-offset-4">
              {request.email}
            </a>
          </Field>
          <Field label="Gender">{GENDER_LABELS[request.gender]}</Field>
          <div className="sm:col-span-2">
            <Field label="Address">{request.address}</Field>
          </div>
        </dl>
      </Panel>

      <Panel
        title="Next step"
        description={
          request.has_account
            ? "A staff account with this email already exists."
            : "No account uses this email yet."
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            {request.has_account
              ? "Use these details to put this name, phone, gender and address on that account."
              : "Add this email in Supabase → Authentication → Users. The new account takes these details automatically and this request closes itself."}
          </p>
          <div className="flex flex-wrap items-start gap-2">{actions}</div>
        </div>
      </Panel>
    </div>
  );
}
