"use client";

/**
 * Picks up a session that arrived in the URL fragment.
 *
 * ── Why a client component is unavoidable here ───────────────────────────────
 * `https://…/reset-password#access_token=…&refresh_token=…` — everything after
 * the `#` is never transmitted to the server. No amount of server code can see
 * it. This is the shape an **invite** link takes, because the Supabase SDK does
 * not support PKCE for invites (the browser that sends an invite is not the
 * browser that accepts it, so there is no code_verifier to pair with) and the
 * flow falls back to implicit.
 *
 * Rendered only when the server found no session. It reads the fragment, hands
 * the tokens to the browser client (which writes the same cookies the server
 * reads), scrubs them out of the address bar, and reloads so the page comes
 * back server-rendered with a real session. If there is no fragment, the link
 * genuinely is expired and it says so.
 *
 * ── The scrub is not cosmetic ────────────────────────────────────────────────
 * A refresh token sitting in `window.location` ends up in browser history, in
 * any "copy link" a confused user sends to a colleague, and in the Referer
 * header of the next outbound request. `history.replaceState` before the await
 * is the cheapest fix.
 *
 * ── Why it lives here and not in src/components/ ─────────────────────────────
 * `npm run guardrails` forbids anything under `src/components/**` from
 * importing a Supabase client, because presentational components must not
 * fetch. This file has to — there is no server-side alternative for reading a
 * fragment. It is not a reusable component, it is one step of this one route,
 * so it is colocated with the route rather than weakening the rule with an
 * allowlist entry.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MailWarningIcon } from "lucide-react";

import { RESET_LINK_INVALID } from "@/lib/auth/messages";
import { createClient } from "@/lib/supabase/client";
import { useHydrated } from "@/lib/use-hydrated";
import { Button } from "@/components/ui/button";

interface LinkTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Reads the fragment once, at module-render time on the client.
 *
 * Deliberately NOT done in an effect: "is there a fragment?" is knowable
 * immediately, so storing it in state would mean an extra render and a
 * setState in an effect body. The `hydrated` gate below is what keeps the
 * server and client markup in agreement.
 */
function readTokensFromHash(): LinkTokens | null {
  if (typeof window === "undefined") return null;

  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : "";
  const params = new URLSearchParams(hash);
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");

  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}

export function SessionFromLink() {
  const hydrated = useHydrated();
  const tokens = useMemo(() => readTokensFromHash(), []);
  const [exchangeFailed, setExchangeFailed] = useState(false);

  useEffect(() => {
    if (!tokens) return;

    // Out of the address bar before the await — see the file header.
    window.history.replaceState(null, "", window.location.pathname);

    let cancelled = false;

    createClient()
      .auth.setSession({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
      })
      .then(({ error }) => {
        if (cancelled) return;
        if (error) {
          setExchangeFailed(true);
          return;
        }
        // A full reload, not router.refresh(): the session cookie has to be
        // present on a fresh server request before the page can render the
        // password form.
        window.location.reload();
      })
      .catch(() => {
        if (!cancelled) setExchangeFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [tokens]);

  // Before hydration there is no way to know which case this is, and a wrong
  // guess would flash "link expired" at someone whose link is fine.
  const expired = hydrated && (!tokens || exchangeFailed);

  if (!expired) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        Checking your link…
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 py-2 text-center">
      <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <MailWarningIcon className="size-5" />
      </span>
      <p className="text-sm text-muted-foreground">{RESET_LINK_INVALID}</p>
      <Button
        variant="outline"
        className="mt-1 w-full"
        nativeButton={false}
        render={<Link href="/forgot-password">Request a new link</Link>}
      />
    </div>
  );
}
