"use client";

/**
 * Choose a new password. Used by both flows that end this way — an invited
 * staff member setting their first password, and anyone completing a reset.
 *
 * Presentational: it collects two fields and hands them to a Server Action.
 * The action does the validating and the redirecting, so a browser with
 * JavaScript disabled still completes the flow through the plain form POST.
 */

import { useActionState, useId } from "react";

import type { UpdatePasswordState } from "@/app/reset-password/actions";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/messages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ResetPasswordForm({
  action,
}: {
  action: (
    state: UpdatePasswordState,
    formData: FormData,
  ) => Promise<UpdatePasswordState>;
}) {
  const passwordId = useId();
  const confirmId = useId();

  const [state, formAction, pending] = useActionState(action, { error: null });

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      <div className="space-y-2">
        <Label htmlFor={passwordId}>New password</Label>
        <Input
          id={passwordId}
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          aria-invalid={Boolean(state.error)}
          aria-describedby={state.error ? "reset-password-error" : undefined}
        />
        <p className="text-xs text-muted-foreground">
          At least {MIN_PASSWORD_LENGTH} characters.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor={confirmId}>Confirm new password</Label>
        <Input
          id={confirmId}
          name="confirm_password"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(state.error)}
        />
      </div>

      {state.error ? (
        <p
          id="reset-password-error"
          role="alert"
          className="text-sm text-destructive"
        >
          {state.error}
        </p>
      ) : null}

      <Button type="submit" className="mt-1 w-full" disabled={pending}>
        {pending ? "Saving…" : "Set password"}
      </Button>
    </form>
  );
}
