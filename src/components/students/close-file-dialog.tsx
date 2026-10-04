"use client";

/**
 * "Close file" — asks for the reason before closing.
 *
 * Presentational. The Server Action and the database decide whether this
 * account may close the file; a reason of fewer than 3 characters is refused
 * there too. Once closed the page re-renders read-only and this unmounts.
 */

import { useActionState, useId } from "react";
import { FolderClosedIcon } from "lucide-react";

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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { FormAction } from "@/types/workspace";

export function CloseFileDialog({ action, canReopen }: { action: FormAction; canReopen: boolean }) {
  const reasonId = useId();
  const [state, formAction, pending] = useActionState(action, { error: null });

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="outline">
            <FolderClosedIcon />
            Close file
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <form action={formAction}>
          <DialogHeader>
            <DialogTitle>Close this student file</DialogTitle>
            <DialogDescription>
              The file becomes read-only for everyone.{" "}
              {canReopen ? "You can reopen it later." : "Only an admin can reopen it."} The reason is saved on the file and in its notes.
            </DialogDescription>
          </DialogHeader>

          <div className="my-5 space-y-2">
            <Label htmlFor={reasonId}>Reason for closing</Label>
            <Textarea id={reasonId} name="reason" required minLength={3} maxLength={2000} rows={4} />
            {state.error ? (
              <p role="alert" className="text-sm text-destructive">
                {state.error}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <DialogClose
              render={
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              }
            />
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? "Closing…" : "Close file"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
