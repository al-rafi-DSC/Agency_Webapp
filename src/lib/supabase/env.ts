/**
 * Environment access for Supabase. Reads variables by their full literal name
 * so Next.js can inline the `NEXT_PUBLIC_*` ones at build time — dynamic lookup
 * like `process.env[name]` silently yields `undefined` in the browser bundle.
 * That is why the two names below are spelled out twice rather than looped over.
 *
 * Values live in `.env.local` (gitignored) and in Vercel's Environment
 * Variables dashboard. See `.env.example` for the names.
 */

/**
 * Public Supabase config — safe in the browser, always subject to RLS.
 *
 * Accepts either generation of browser key, preferring the newer one:
 *
 *   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY   sb_publishable_…  (current)
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY          eyJ…              (legacy JWT)
 *
 * They behave identically here. Neither is read-only: both can insert, update
 * and delete anywhere a policy permits, so write policies need the same
 * scrutiny as read policies (CLAUDE.md § Environment Variables).
 */
export function requireSupabasePublicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing Supabase environment variables. Copy .env.example to .env.local " +
        "and fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY " +
        "(or the legacy NEXT_PUBLIC_SUPABASE_ANON_KEY). " +
        "To browse the UI without a Supabase project, set NEXT_PUBLIC_UI_PREVIEW=true instead.",
    );
  }

  return { url: normalizeSupabaseUrl(url), anonKey: key };
}

/**
 * Trims a trailing API path off the project URL.
 *
 * The dashboard surfaces `https://<ref>.supabase.co/rest/v1/` in some places,
 * and it is an easy value to copy by mistake. supabase-js appends `/rest/v1`,
 * `/auth/v1` and `/storage/v1` itself, so passing the endpoint through would
 * produce `/rest/v1/rest/v1/…` and 404 every call — with an error message that
 * points nowhere near the cause. Cheaper to normalize than to debug.
 */
function normalizeSupabaseUrl(url: string) {
  return url.trim().replace(/\/+(?:rest|auth|storage|realtime)\/v\d+\/?$/, "").replace(/\/+$/, "");
}

/**
 * UI preview mode — renders auth-gated screens against mock fixtures with no
 * Supabase project and no login, so UI work (including Builder.io Fusion) needs
 * zero credentials.
 *
 * Hard-gated on a non-production NODE_ENV: Vercel builds with
 * NODE_ENV=production, so this cannot be switched on in a deployed
 * environment even if the variable is set there by mistake.
 */
export function isUiPreview() {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.NEXT_PUBLIC_UI_PREVIEW === "true"
  );
}
