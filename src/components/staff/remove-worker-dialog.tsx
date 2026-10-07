"use client";

/**
 * "Remove worker" — confirms before removing.
 *
 * Presentational. Removal is decided and enforced by the database
 * (`set_worker_removed`): Admin only, never yourself, nothing deleted. Once
 * removed the page re-renders with a Restore notice and this unmounts.
 */

import { useActionState } from "react";
import { UserMinusIcon } from "lucide-react";

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
import type { FormAction } from "@/types/workspace";

export function RemoveWorkerDialog({
  action,
  workerName,
  assignedCount,
}: {
  action: FormAction;
  workerName: string;
  /** Files still assigned to them, which will need reassigning. */
  assignedCount: number;
}) {
  const [state, formAction, pending] = useActionState(action, { error: null });

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="destructive">
            <UserMinusIcon />
            Remove worker
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <form action={formAction}>
          <DialogHeader>
            <DialogTitle>Remove {workerName}?</DialogTitle>
            <DialogDescription>
              They will no longer be able to sign in, and they leave the Workers list and every
              dropdown. Nothing is deleted: their name stays on the notes and history they wrote, and
              you can restore them later from Workers → Removed workers.
            </DialogDescription>
          </DialogHeader>

          {assignedCount > 0 ? (
            <p className="mt-4 rounded-lg bg-warning-soft p-3 text-sm text-warning-soft-foreground">
              {assignedCount === 1
                ? "1 student file is still assigned to them."
                : `${assignedCount} student files are still assigned to them.`}{" "}
              They will appear under Needs attention on your dashboard so you can reassign them.
            </p>
          ) : null}

          {state.error ? (
            <p role="alert" className="mt-4 text-sm text-destructive">
              {state.error}
            </p>
          ) : null}

          <DialogFooter className="mt-5">
            <DialogClose
              render={
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              }
            />
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? "Removing…" : "Remove worker"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
