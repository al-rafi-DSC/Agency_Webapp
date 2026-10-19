"use client";

/**
 * "Delete permanently" for a closed student file — Admin only.
 *
 * Presentational. The rules live in the database
 * (`delete_closed_student_file`): Admin only, closed files only, and the typed
 * name must match the file. The button stays disabled until the name matches
 * here too, so the database check is a backstop rather than the first thing
 * the Admin hits. On success the list re-renders without the row and this
 * unmounts.
 */

import { useActionState, useId, useState } from "react";
import { Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const normalise = (value: string) => value.trim().toLowerCase();

export function DeleteClosedFileDialog({
  action,
  studentName,
}: {
  action: FormAction;
  studentName: string;
}) {
  const [state, formAction, pending] = useActionState(action, { error: null });
  const [typed, setTyped] = useState("");
  const inputId = useId();
  const matches = normalise(typed) === normalise(studentName);

  return (
    <Dialog onOpenChange={(open) => { if (!open) setTyped(""); }}>
      <DialogTrigger
        render={
          <Button variant="destructive" size="sm" aria-label={`Delete ${studentName} permanently`}>
            <Trash2Icon />
            Delete
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <form action={formAction}>
          <DialogHeader>
            <DialogTitle>Delete {studentName} permanently?</DialogTitle>
            <DialogDescription>
              This erases the student file for good, with its university applications and their
              history, notes, document records, worker assignments and the form submission it came
              from. It cannot be undone or restored.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-2">
            <Label htmlFor={inputId}>
              Type <span className="font-semibold">{studentName}</span> to confirm
            </Label>
            <Input
              id={inputId}
              name="confirm_name"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
          </div>

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
            <Button type="submit" variant="destructive" disabled={pending || !matches}>
              {pending ? "Deleting…" : "Delete permanently"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
