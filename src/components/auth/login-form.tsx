"use client";

/**
 * Sign-in form — UI ONLY. It authenticates nobody.
 *
 * ── Why there is no auth call here ───────────────────────────────────────────
 * Signing in touches Supabase Auth and sets a session cookie, which is
 * hand-written server-side code under `src/lib/supabase/` plus `src/proxy.ts`
 * (AGENTS.md). A form component is the wrong place for it, and a half-wired one
 * would be worse than none.
 *
 * ── Two things this must never grow into ─────────────────────────────────────
 * 1. A "Create account" link. PRD §7: accounts exist only by Admin invite.
 *    There is no public sign-up to link to.
 * 2. A message that distinguishes "no such account" from "wrong password".
 *    Both must read the same, or the form becomes a way to check whether an
 *    email address has an account here.
 */

import type { FormEvent } from "react";
import { useId, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm({
  forgotPasswordHref,
}: {
  forgotPasswordHref: string;
}) {
  const emailId = useId();
  const passwordId = useId();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (email.trim().length === 0 || password.length === 0) {
      setError("Enter your email and password.");
      return;
    }

    setError(null);

    // ── PHASE 3 SEAM ─────────────────────────────────────────────────────────
    // Replace with the hand-written sign-in path (Supabase Auth + session
    // cookie). Any failure it reports must stay deliberately vague — see the
    // file header.
    toast.info("Sign-in is not wired up yet", {
      description:
        "Auth runs through Supabase and hand-written server code, which lands in Phase 3.",
    });
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
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "login-error" : undefined}
        />
      </div>

      {error ? (
        <p id="login-error" role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Button type="submit" className="mt-1 w-full">
        Sign in
      </Button>
    </form>
  );
}
