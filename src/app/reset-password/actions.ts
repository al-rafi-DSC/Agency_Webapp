"use server";

/**
 * Set a new password.
 *
 * Reached two ways, both of which arrive here already holding a session that
 * /auth/callback established from an emailed link:
 *
 *   - an invited staff member choosing their first password
 *   - anyone completing a "forgot password" flow
 *
 * The session is the authorisation. `updateUser` changes the password of
 * whoever the cookie says is signed in, so an unauthenticated request here
 * changes nothing — but it must not be allowed to *look* like it succeeded,
 * hence the explicit check.
 */

import { redirect } from "next/navigation";

import { homePathForRole } from "@/lib/auth/roles";
import {
  MIN_PASSWORD_LENGTH,
  PASSWORDS_DO_NOT_MATCH,
  PASSWORD_TOO_SHORT,
  PASSWORD_UPDATE_FAILED,
  RESET_LINK_INVALID,
} from "@/lib/auth/messages";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedProfile } from "@/lib/supabase/session";

export interface UpdatePasswordState {
  error: string | null;
}

export async function updatePasswordAction(
  _prevState: UpdatePasswordState,
  formData: FormData,
): Promise<UpdatePasswordState> {
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirm_password") ?? "");

  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: PASSWORD_TOO_SHORT };
  }
  if (password !== confirmation) {
    return { error: PASSWORDS_DO_NOT_MATCH };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: RESET_LINK_INVALID };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: PASSWORD_UPDATE_FAILED };
  }

  // The profile decides where they land. An invited staff member has been
  // 'staff' since the trigger ran; nothing about choosing a password changes
  // a role.
  const profile = await getAuthenticatedProfile();

  if (!profile || profile.status === "inactive") {
    // Deactivated between the invite and the click. Do not leave a usable
    // session behind.
    await supabase.auth.signOut();
    redirect("/login");
  }

  redirect(homePathForRole(profile.role));
}
