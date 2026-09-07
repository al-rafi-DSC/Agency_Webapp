/**
 * Every user-facing auth message, in one file.
 *
 * ── Why they live here and not at the call site ──────────────────────────────
 * These strings are a security control, not copy. The login page is public, so
 * a message that distinguishes "no such account" from "wrong password" turns
 * the form into a way to test whether an address has an account at this
 * agency — which, for a system holding student immigration documents, is
 * itself information worth protecting.
 *
 * Keeping them in one module means a call site cannot quietly invent a more
 * helpful variant. If you find yourself wanting to add
 * SIGN_IN_ACCOUNT_DEACTIVATED here, that is the failure this file exists to
 * prevent: the sign-in path already covers it with SIGN_IN_FAILED.
 */

/**
 * The ONLY message the sign-in form may show for a failed attempt. Covers a
 * wrong password, an unknown address, an unconfirmed account, and a
 * deactivated one — all of them, identically, on purpose.
 */
export const SIGN_IN_FAILED =
  "That email and password combination did not work.";

/** Shown whether or not the address has an account. */
export const PASSWORD_RESET_SENT =
  "If an account exists for that address, a reset link is on its way.";

export const RESET_LINK_INVALID =
  "That link has expired or has already been used. Request a new one.";

export const PASSWORD_TOO_SHORT =
  "Use at least 8 characters.";

export const PASSWORDS_DO_NOT_MATCH =
  "Those two passwords do not match.";

export const PASSWORD_UPDATE_FAILED =
  "That password could not be set. Request a new link and try again.";

export const EMAIL_REQUIRED = "Enter the email address on your account.";

export const CREDENTIALS_REQUIRED = "Enter your email and password.";

/** Minimum password length. Supabase's own default is 6; 8 is the floor here. */
export const MIN_PASSWORD_LENGTH = 8;
