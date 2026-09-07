import "server-only";

/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  SERVICE ROLE CLIENT — BYPASSES ROW LEVEL SECURITY ENTIRELY.              ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 *
 * This client ignores every RLS policy. A query made through it can read and
 * write EVERY student record regardless of who is logged in. Treat a leaked
 * `SUPABASE_SERVICE_ROLE_KEY` as a full database compromise.
 *
 * `import "server-only"` makes importing this from a Client Component a BUILD
 * ERROR, not a code-review catch. Do not remove that line, and do not add a
 * `NEXT_PUBLIC_` alias for the key.
 *
 * LEGITIMATE USES (there are only a few — PRD §7, CLAUDE.md § Security Rules):
 *   - Admin-invite staff creation via the Supabase Auth admin API
 *     (no public self-signup).
 *   - Superadmin support paths.
 *   - Scheduled maintenance / backup jobs.
 *
 * NOT a legitimate use: "the RLS policy was inconvenient". If a normal screen
 * needs this client, the policy is wrong — fix the policy.
 *
 * Every call site MUST establish who the caller is and that they are allowed to
 * do this, BEFORE using this client. The database will not check for you.
 */

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { requireSupabasePublicEnv } from "@/lib/supabase/env";

/**
 * Accepts either generation of privileged key, preferring the newer one:
 *
 *   SUPABASE_SECRET_KEY          sb_secret_…  (current)
 *   SUPABASE_SERVICE_ROLE_KEY    eyJ…         (legacy JWT)
 *
 * Both bypass RLS completely. `npm run guardrails` treats the two names
 * identically: neither may be referenced outside this file, and neither may
 * ever appear as a NEXT_PUBLIC_ variable.
 */
export function createAdminClient() {
  const { url } = requireSupabasePublicEnv();
  const secretKey =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secretKey) {
    throw new Error(
      "Missing SUPABASE_SECRET_KEY (or the legacy SUPABASE_SERVICE_ROLE_KEY). " +
        "Copy it from Supabase → Settings → API Keys into .env.local and Vercel. " +
        "It is server-only and must never be exposed to the browser.",
    );
  }

  return createSupabaseClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
