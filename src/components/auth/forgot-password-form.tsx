"use client";

/**
 * Password reset request.
 *
 * ── The response is intentionally uninformative ──────────────────────────────
 * Whatever address is entered, the screen says the same thing: if an account
 * exists, a link has been sent. Confirming that an email address does or does
 * not have an account here turns this form into an account-enumeration tool,
 * and it is a public page. The Server Action goes further and swallows
 * rate-limit failures too, because "too many requests for this address"
 * confirms the address just as effectively as an explicit message would.
 *
 * ── The constraint that will bite ────────────────────────────────────────────
 * Supabase's default auth mailer is capped near two emails an hour (CLAUDE.md).
 * Until custom SMTP is configured, this form will honestly report that a
 * request was received for mail that never went out.
 */

import { useActionState, useId } from "react";
import { MailCheckIcon } from "lucide-react";

import type { ResetRequestState } from "@/app/forgot-password/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ForgotPasswordForm({
  action,
}: {
  action: (
    state: ResetRequestState,
    formData: FormData,
  ) => Promise<ResetRequestState>;
}) {
  const emailId = useId();

  const [state, formAction, pending] = useActionState(action, {
    error: null,
    sent: false,
    message: null,
  });

  if (state.sent) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <span className="flex size-10 items-center justify-center rounded-full bg-success-soft text-success-soft-foreground">
          <MailCheckIcon className="size-5" />
        </span>
        <div className="space-y-1">
          <p className="text-sm font-medium">Check your inbox</p>
          <p className="text-sm text-muted-foreground">{state.message}</p>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      <div className="space-y-2">
        <Label htmlFor={emailId}>Email</Label>
        <Input
          id={emailId}
          name="email"
          type="email"
          placeholder="you@agency.com"
          autoComplete="email"
          aria-invalid={Boolean(state.error)}
          aria-describedby={state.error ? "reset-error" : undefined}
        />
      </div>

      {state.error ? (
        <p id="reset-error" role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" className="mt-1 w-full" disabled={pending}>
        {pending ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}
