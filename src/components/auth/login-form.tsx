"use client";

/**
 * Sign-in form.
 *
 * ── Two things this must never grow into ─────────────────────────────────────
 * 1. A "Create account" link. PRD §7: accounts exist only by Admin invite.
 *    There is no public sign-up to link to.
 * 2. A message that distinguishes "no such account" from "wrong password".
 *    Both must read the same, or the form becomes a way to check whether an
 *    email address has an account here. The action returns a single string
 *    from `@/lib/auth/messages` for every failure; this component only renders
 *    whatever it is handed and never adds a reason of its own.
 *
 * The authentication itself lives in `src/app/login/actions.ts` — a Server
 * Action, because signing in sets a session cookie and a Client Component
 * cannot. Using a plain `action={…}` form rather than an onSubmit handler also
 * means the flow still works with JavaScript disabled.
 */

import { useActionState, useId } from "react";
import Link from "next/link";

import type { SignInState } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm({
  action,
  forgotPasswordHref,
  next,
}: {
  action: (state: SignInState, formData: FormData) => Promise<SignInState>;
  forgotPasswordHref: string;
  /** Where to land after signing in. Re-validated server-side — see the action. */
  next?: string;
}) {
  const emailId = useId();
  const passwordId = useId();

  const [state, formAction, pending] = useActionState(action, { error: null });

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}

      <div className="space-y-2">
        <Label htmlFor={emailId}>Email</Label>
        <Input
          id={emailId}
          name="email"
          type="email"
          placeholder="you@agency.com"
          autoComplete="email"
          aria-invalid={Boolean(state.error)}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <Label htmlFor={passwordId}>Password</Label>
          <Link
            href={forgotPasswordHref}
            className="rounded text-xs text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Forgot password?
          </Link>
        </div>
        <Input
          id={passwordId}
          name="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={Boolean(state.error)}
          aria-describedby={state.error ? "login-error" : undefined}
        />
      </div>

      {state.error ? (
        <p id="login-error" role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" className="mt-1 w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
