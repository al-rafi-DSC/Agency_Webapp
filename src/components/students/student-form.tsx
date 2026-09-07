"use client";

/**
 * Open a new student file — the FORM UI only (PRD §5.1).
 *
 * ── The seam ─────────────────────────────────────────────────────────────────
 * There is deliberately no submit handler that writes anything. Creating a
 * student is a write, writes go through a Server Action, and an `actions.ts`
 * file is hand-written territory (AGENTS.md) landing in Phase 3. The marked
 * spot below is where that action gets wired in; until then the form validates,
 * reports what it would have saved, and saves nothing.
 *
 * Validation here is a convenience, not a guarantee. The real constraints are
 * NOT NULL / CHECK constraints in Postgres plus an RLS policy deciding whether
 * this account may insert at all. Client validation that disagrees with the
 * database is a bug in the client, never the other way round.
 *
 * ── What this form does not do ───────────────────────────────────────────────
 * No photo upload (Supabase Storage, Phase 3 — see `documents-panel.tsx` for
 * the free-tier constraint). No assignment suggestion: PRD §10 leaves the
 * matching rules open, so the staff select starts unassigned and stays manual.
 */

import type { FormEvent, ReactNode } from "react";
import { useId, useState } from "react";
import Link from "next/link";
import { InfoIcon } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Staff } from "@/types/db";

const UNASSIGNED = "unassigned";

interface Errors {
  fullName?: string;
  fileOpenedAt?: string;
}

function validate(fullName: string, fileOpenedAt: string): Errors {
  const errors: Errors = {};

  if (fullName.trim().length === 0) {
    errors.fullName = "A student file needs a name.";
  } else if (fullName.trim().length < 2) {
    errors.fullName = "That looks too short to be a full name.";
  }

  if (fileOpenedAt.length === 0) {
    errors.fileOpenedAt = "Pick the date this file was opened.";
  }

  return errors;
}

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export function StudentForm({
  staff,
  defaultFileOpenedAt,
  cancelHref,
}: {
  staff: Staff[];
  /** Today, resolved on the server so the field does not differ per timezone. */
  defaultFileOpenedAt: string;
  cancelHref: string;
}) {
  const nameId = useId();
  const dateId = useId();
  const staffFieldId = useId();

  const [fullName, setFullName] = useState("");
  const [fileOpenedAt, setFileOpenedAt] = useState(defaultFileOpenedAt);
  const [assignedStaffId, setAssignedStaffId] = useState(UNASSIGNED);
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);

  const staffItems: Record<string, string> = {
    [UNASSIGNED]: "Unassigned",
    ...Object.fromEntries(staff.map((member) => [member.id, member.full_name])),
  };

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);

    const nextErrors = validate(fullName, fileOpenedAt);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      toast.error("Check the highlighted fields");
      return;
    }

    // ── PHASE 3 SEAM ─────────────────────────────────────────────────────────
    // Replace this toast with the hand-written Server Action that inserts the
    // student row. Nothing above this line needs to change.
    toast.info("File not created", {
      description: `Opening a file for ${fullName.trim()} needs the Server Action that lands in Phase 3 — nothing was saved.`,
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <div className="surface-panel flex flex-col gap-5 p-5">
        <Field
          id={nameId}
          label="Full name"
          hint="As it appears on the passport — university forms have to match."
          error={submitted ? errors.fullName : undefined}
        >
          <Input
            id={nameId}
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="e.g. Farhana Islam"
            autoComplete="off"
            aria-invalid={submitted && Boolean(errors.fullName)}
            aria-describedby={
              submitted && errors.fullName ? `${nameId}-error` : undefined
            }
          />
        </Field>

        <Field
          id={dateId}
          label="File opened"
          hint="Defaults to today."
          error={submitted ? errors.fileOpenedAt : undefined}
        >
          <Input
            id={dateId}
            type="date"
            value={fileOpenedAt}
            onChange={(event) => setFileOpenedAt(event.target.value)}
            aria-invalid={submitted && Boolean(errors.fileOpenedAt)}
            aria-describedby={
              submitted && errors.fileOpenedAt ? `${dateId}-error` : undefined
            }
          />
        </Field>

        <Field
          id={staffFieldId}
          label="Assign to"
          hint="Optional. A file can be opened now and assigned later — assignment is always manual."
        >
          <Select
            items={staffItems}
            value={assignedStaffId}
            onValueChange={(next) => setAssignedStaffId(String(next))}
          >
            <SelectTrigger id={staffFieldId} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
              {staff.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Alert>
        <InfoIcon />
        <AlertTitle>This form does not save yet</AlertTitle>
        <AlertDescription>
          Creating a student is a database write, which goes through a
          hand-written Server Action in Phase 3. Universities, photos and
          documents are added on the student file after it exists — this form
          only opens the file.
        </AlertDescription>
      </Alert>

      <div className="flex flex-wrap gap-2">
        <Button type="submit">Open file</Button>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href={cancelHref}>Cancel</Link>}
        />
      </div>
    </form>
  );
}
