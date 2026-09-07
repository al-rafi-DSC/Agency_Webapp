"use client";

/**
 * "Invite staff" — PRD §6, flow 1.
 *
 * Presentational. It collects an address and hands it to a Server Action; the
 * action verifies that the caller is an Admin before it touches the Supabase
 * Auth admin API. Rendering this dialog is not what makes the invite allowed
 * — a staff account that somehow opened it would still be refused server-side.
 *
 * There is no password field and there never should be: the invitee sets their
 * own password from the emailed link, so an Admin never knows it.
 */

import { useActionState, useId } from "react";
import { UserPlusIcon } from "lucide-react";

import type { InviteStaffState } from "@/app/(admin)/admin/staff/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function InviteStaffDialog({
  action,
}: {
  action: (
    state: InviteStaffState,
    formData: FormData,
  ) => Promise<InviteStaffState>;
}) {
  const emailId = useId();
  const nameId = useId();

  const [state, formAction, pending] = useActionState(action, {
    error: null,
    message: null,
  });

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button>
            <UserPlusIcon />
            Invite staff
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <form action={formAction}>
          <DialogHeader>
            <DialogTitle>Invite a staff member</DialogTitle>
            <DialogDescription>
              They receive a link, choose their own password, and land in a
              workspace scoped to the students you assign them.
            </DialogDescription>
          </DialogHeader>

          <div className="my-5 flex flex-col gap-4">
            <div className="space-y-2">
              <Label htmlFor={emailId}>Email</Label>
              <Input
                id={emailId}
                name="email"
                type="email"
                placeholder="colleague@agency.com"
                autoComplete="off"
                aria-invalid={Boolean(state.error)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={nameId}>Full name</Label>
              <Input
                id={nameId}
                name="full_name"
                type="text"
                placeholder="Their name as it should appear"
                autoComplete="off"
              />
            </div>

            {state.error ? (
              <p role="alert" className="text-sm text-destructive">
                {state.error}
              </p>
            ) : null}

            {state.message ? (
              <Alert>
                <AlertDescription>{state.message}</AlertDescription>
              </Alert>
            ) : null}
          </div>

          <DialogFooter>
            <DialogClose
              render={
                <Button type="button" variant="outline">
                  Close
                </Button>
              }
            />
            <Button type="submit" disabled={pending}>
              {pending ? "Sending…" : "Send invite"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
