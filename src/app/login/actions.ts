"use server";

/**
 * Sign in.
 *
 * ── The one rule this file exists to hold ────────────────────────────────────
 * Every failure returns the SAME message. Wrong password, unknown address,
 * unconfirmed account, deactivated account — all of them, identically.
 *
 * This is not politeness. `/login` is a public page, so a message that
 * distinguishes those cases lets anyone test whether a given email address has
 * an account at this agency, one address at a time. Do not "improve" the error
 * handling below by branching on `error.code`.
 */

import { redirect } from "next/navigation";

import { homePathForRole, safeRedirectPath } from "@/lib/auth/roles";
import { CREDENTIALS_REQUIRED, SIGN_IN_FAILED } from "@/lib/auth/messages";
import { getAuthenticatedProfile } from "@/lib/supabase/session";
import { createClient } from "@/lib/supabase/server";

export interface SignInState {
  error: string | null;
}

export async function signInAction(
  _prevState: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = formData.get("next");

  if (email.length === 0 || password.length === 0) {
    return { error: CREDENTIALS_REQUIRED };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: SIGN_IN_FAILED };
  }

  // The credentials were right, but the account may still not be allowed in:
  // a departed staff member is `status = 'inactive'`, and an account with no
  // profile row has no role at all. Both are refused, and — per the rule at
  // the top of this file — refused with the same wording as a bad password.
  const profile = await getAuthenticatedProfile();

  if (!profile || profile.status === "inactive") {
    await supabase.auth.signOut();
    return { error: SIGN_IN_FAILED };
  }

  // Outside the branch above on purpose: redirect() works by throwing, and a
  // throw inside an `if (error)` block reads like an error path to the next
  // person editing this.
  redirect(
    safeRedirectPath(
      typeof next === "string" ? next : null,
      homePathForRole(profile.role),
    ),
  );
}
