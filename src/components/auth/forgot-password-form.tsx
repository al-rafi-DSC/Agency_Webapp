"use client";

/**
 * Password reset request — UI ONLY.
 *
 * ── The response is intentionally uninformative ──────────────────────────────
 * Whatever address is entered, the screen says the same thing: if an account
 * exists, a link has been sent. Confirming that an email address does or does
 * not have an account here turns this form into an account-enumeration tool,
 * and it is a public page.
 *
 * ── The constraint that will bite ────────────────────────────────────────────
 * Supabase's default auth mailer is capped near two emails an hour (CLAUDE.md).
 * Custom SMTP has to be configured before reset emails are relied on, or staff
 * will silently not receive them.
 */

import type { FormEvent } from "react";
import { useId, useState } from "react";
import { MailCheckIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ForgotPasswordForm() {
  const emailId = useId();

  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (email.trim().length === 0) {
      setError("Enter the email address on your account.");
      return;
    }

    setError(null);

    // ── PHASE 3 SEAM ─────────────────────────────────────────────────────────
    // Replace with the hand-written reset request. The confirmation below must
    // stay identical whether or not the account exists.
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <span className="flex size-10 items-center justify-center rounded-full bg-success-soft text-success-soft-foreground">
          <MailCheckIcon className="size-5" />
        </span>
        <div className="space-y-1">
          <p className="text-sm font-medium">Check your inbox</p>
          <p className="text-sm text-muted-foreground">
            If an account exists for that address, a reset link is on its way.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Nothing was actually sent — the reset flow is wired up in Phase 3.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <div className="space-y-2">
        <Label htmlFor={emailId}>Email</Label>
        <Input
          id={emailId}
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@agency.com"
          autoComplete="email"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "reset-error" : undefined}
        />
      </div>

      {error ? (
        <p id="reset-error" role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Button type="submit" className="mt-1 w-full">
        Send reset link
      </Button>
    </form>
  );
}
