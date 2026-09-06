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

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
        "The service role key is server-only and must never be exposed to the browser.",
    );
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
