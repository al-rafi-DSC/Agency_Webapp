/**
 * Environment access for Supabase. Reads variables by their full literal name
 * so Next.js can inline the `NEXT_PUBLIC_*` ones at build time — dynamic lookup
 * like `process.env[name]` silently yields `undefined` in the browser bundle.
 *
 * Values live in `.env.local` (gitignored) and in Vercel's Environment
 * Variables dashboard. See `.env.example` for the names.
 */

/** Public Supabase config — safe in the browser, always subject to RLS. */
export function requireSupabasePublicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing Supabase environment variables. Copy .env.example to .env.local " +
        "and fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "To browse the UI without a Supabase project, set NEXT_PUBLIC_UI_PREVIEW=true instead.",
    );
  }

  return { url, anonKey };
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
