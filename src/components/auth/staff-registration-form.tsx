"use client";

/**
 * New staff details form.
 *
 * Presentational. It sends a name, phone, Gmail address, gender and address to
 * a Server Action, which queues a request for the Admin. It creates no account
 * — there is no password field here and there should not be one.
 */

import { useActionState, useId } from "react";
import { CheckIcon } from "lucide-react";

import type { StaffRequestState } from "@/app/join/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SelectField } from "@/components/workspace/mutation-form";
import { GENDER_LABELS } from "@/types/workspace";

const GENDER_OPTIONS = [
  { value: "", label: "Choose…" },
  ...Object.entries(GENDER_LABELS).map(([value, label]) => ({ value, label })),
];

export function StaffRegistrationForm({
  action,
}: {
  action: (
    state: StaffRequestState,
    formData: FormData,
  ) => Promise<StaffRequestState>;
}) {
  const nameId = useId();
  const phoneId = useId();
  const emailId = useId();
  const addressId = useId();

  const [state, formAction, pending] = useActionState(action, {
    error: null,
    sent: false,
    message: null,
  });

  if (state.sent) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <span className="flex size-10 items-center justify-center rounded-full bg-success-soft text-success-soft-foreground">
          <CheckIcon className="size-5" />
        </span>
        <div className="space-y-1">
          <p className="text-sm font-medium">Details sent</p>
          <p className="text-sm text-muted-foreground">{state.message}</p>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="space-y-2">
        <Label htmlFor={nameId}>Name</Label>
        <Input
          id={nameId}
          name="full_name"
          type="text"
          placeholder="Your name as it should appear"
          autoComplete="name"
          required
          minLength={2}
          maxLength={200}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={phoneId}>Phone number</Label>
        <Input
          id={phoneId}
          name="phone"
          type="tel"
          autoComplete="tel"
          required
          minLength={3}
          maxLength={80}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={emailId}>Gmail</Label>
        <Input
          id={emailId}
          name="email"
          type="email"
          placeholder="you@gmail.com"
          autoComplete="email"
          required
          maxLength={320}
          aria-describedby={`${emailId}-hint`}
        />
        <p id={`${emailId}-hint`} className="text-xs text-muted-foreground">
          The address you will sign in with.
        </p>
      </div>

      <SelectField name="gender" label="Gender" options={GENDER_OPTIONS} />

      <div className="space-y-2">
        <Label htmlFor={addressId}>Address</Label>
        <Textarea
          id={addressId}
          name="address"
          autoComplete="street-address"
          required
          minLength={3}
          maxLength={500}
          rows={3}
        />
      </div>

      {/* Honeypot — see the Server Action. Hidden from people and screen readers. */}
      <div aria-hidden className="hidden">
        <input name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" className="mt-1 w-full" disabled={pending}>
        {pending ? "Sending…" : "Send my details"}
      </Button>
    </form>
  );
}
