/**
 * Waiting requests from the staff details form (/join).
 *
 * Presentational. A request is not an account: the Admin still adds the email
 * in Supabase, and the new account then takes the details shown here.
 * The controls are supplied by the page. Renders nothing when empty, so the
 * panel only appears when there is something to do.
 */

import type { ReactNode } from "react";
import { UserPlusIcon } from "lucide-react";

import { formatDate } from "@/lib/format";
import { Panel } from "@/components/panel";
import { GENDER_LABELS, type StaffRegistration } from "@/types/workspace";

export function StaffRequests({
  requests,
  actions,
  className,
}: {
  requests: StaffRegistration[];
  /** The controls for each request id. */
  actions: Record<string, ReactNode>;
  className?: string;
}) {
  if (requests.length === 0) return null;

  return (
    <Panel
      title={requests.length === 1 ? "1 new staff request" : `${requests.length} new staff requests`}
      description="Sent from the staff details form. Add the email in Supabase → Authentication → Users; the account takes these details automatically."
      className={className}
    >
      <ul className="divide-y">
        {requests.map((request) => (
          <li
            key={request.id}
            className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
          >
            <div className="flex min-w-0 items-start gap-3">
              <span
                aria-hidden
                className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-warning-soft text-warning-soft-foreground"
              >
                <UserPlusIcon className="size-3.5" />
              </span>
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-medium break-words">{request.full_name}</p>
                <p className="text-sm break-all text-muted-foreground">
                  {request.email}
                  {` · ${request.phone} · ${GENDER_LABELS[request.gender]}`}
                </p>
                <p className="text-sm break-words text-muted-foreground">{request.address}</p>
                <p className="text-xs text-muted-foreground">
                  Sent {formatDate(request.submitted_at)}
                  {request.has_account
                    ? " · An account with this email already exists."
                    : " · No account yet."}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-start gap-2">{actions[request.id]}</div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
