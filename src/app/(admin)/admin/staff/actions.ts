"use server";

import "server-only";

/**
 * Admin-only account management — the invite flow from PRD §6, flow 1.
 *
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  EVERY ACTION IN THIS FILE USES THE SECRET-KEY CLIENT, WHICH BYPASSES     ║
 * ║  ROW LEVEL SECURITY. THE DATABASE WILL NOT CHECK THE CALLER FOR US.      ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 *
 * Everywhere else in this app, a staff account calling a query it should not
 * is refused by a policy — the code can be wrong and the data stays safe.
 * Not here. `createAdminClient()` runs as the service role, so `requireAdmin()`
 * below is the ONLY thing standing between a signed-in staff member and the
 * ability to invite themselves a second account with `role: 'admin'`.
 *
 * If you add an action to this file, it starts with `await requireAdmin()`.
 * There is no exception to that.
 */

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { getSessionUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUiPreview } from "@/lib/supabase/env";
import type { SessionUser } from "@/types/ui";

export interface InviteStaffState {
  error: string | null;
  message: string | null;
}

/**
 * Ban duration used to lock a departed account out at the Auth layer.
 * ~100 years. Supabase expresses bans as a duration, not a flag; "none" lifts.
 */
const INDEFINITE_BAN = "876000h";

async function requireAdmin(): Promise<SessionUser> {
  const user = await getSessionUser({ previewAs: "admin" });

  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    // Deliberately not a redirect. A redirect would read as a routing
    // accident; a thrown error is an unambiguous refusal in the server log.
    throw new Error("Not authorised to manage staff accounts.");
  }

  return user;
}

/**
 * Invites a staff member by email. They receive a link, choose their own
 * password, and land in their scoped workspace.
 *
 * There is no password parameter and no "create user" path here on purpose:
 * an Admin should never know a staff member's password, and PRD §7 rules out
 * public sign-up entirely, so invite is the only way an account comes into
 * existence.
 */
export async function inviteStaffAction(
  _prevState: InviteStaffState,
  formData: FormData,
): Promise<InviteStaffState> {
  await requireAdmin();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const fullName = String(formData.get("full_name") ?? "").trim();

  if (email.length === 0 || !email.includes("@")) {
    return { error: "Enter a valid email address.", message: null };
  }

  if (isUiPreview()) {
    return {
      error: null,
      message: `Preview mode — no invite was sent to ${email}. Set NEXT_PUBLIC_UI_PREVIEW=false to send real invites.`,
    };
  }

  const origin = await requestOrigin();
  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    // `data` becomes raw_user_meta_data, which the account holder can rewrite
    // themselves from the browser with nothing but the publishable key.
    // Display name only — never anything that decides what they may do.
    data: { full_name: fullName },
    redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/reset-password")}`,
  });

  if (error) {
    // Unlike the public sign-in form, being specific here is fine: the caller
    // is already an authenticated Admin, so "that address already has an
    // account" tells them nothing they could not learn from the roster.
    return { error: error.message, message: null };
  }

  // Stamps the role into app_metadata, the ONE piece of user-facing metadata
  // a client cannot rewrite. inviteUserByEmail only accepts `data`
  // (user_metadata), which is exactly where a role must never live, so it
  // takes a second call.
  //
  // `profiles.role` remains the sole authority — nothing in the app reads this
  // claim. It exists for `public.handle_new_user()`, the signup trigger, which
  // seeds profiles.role from it. That trigger has already run by now (it fires
  // on the INSERT inside inviteUserByEmail above) and correctly defaulted this
  // account to 'staff', so what this call really does is make the next path
  // that creates a non-staff account work without a schema change.
  //
  // Ordering matters: the profile already exists at the least-privileged role,
  // so a failure here leaves the account with LESS access than intended, never
  // more.
  if (data.user) {
    await admin.auth.admin.updateUserById(data.user.id, {
      app_metadata: { role: "staff" },
    });
  }

  revalidatePath("/admin/staff");

  return {
    error: null,
    message: `Invite sent to ${email}. They set their own password from the link.`,
  };
}

/**
 * Marks a staff account active or inactive (PRD: departure raises an Admin
 * alert and the Admin reassigns manually — the students stay put).
 *
 * Deactivation does two things, and both are needed:
 *   1. `profiles.status = 'inactive'` — read by `getSessionUser()`, so the
 *      account is refused on its next request.
 *   2. An auth-level ban — stops the refresh token, so an already-issued
 *      access token cannot be renewed. Without this, step 1 alone still
 *      blocks the app, but the account keeps a valid Supabase token until it
 *      expires.
 *
 * NOT WIRED TO A BUTTON YET, deliberately: the staff roster still renders from
 * `src/lib/mock/`, so there are no real rows to act on. It lands with the data
 * layer, and is written now so the auth half is complete and reviewable.
 */
export async function setStaffStatusAction(
  profileId: string,
  status: "active" | "inactive",
): Promise<{ error: string | null }> {
  const caller = await requireAdmin();

  if (caller.id === profileId) {
    return { error: "You cannot deactivate your own account." };
  }

  if (isUiPreview()) {
    return { error: "Preview mode — no account was changed." };
  }

  const admin = createAdminClient();

  const { error: profileError } = await admin
    .from("profiles")
    .update({ status })
    .eq("id", profileId);

  if (profileError) {
    return { error: profileError.message };
  }

  const { error: banError } = await admin.auth.admin.updateUserById(profileId, {
    ban_duration: status === "inactive" ? INDEFINITE_BAN : "none",
  });

  if (banError) {
    return { error: banError.message };
  }

  revalidatePath("/admin/staff");
  return { error: null };
}

/** See the note in `src/app/forgot-password/actions.ts` — same reasoning. */
async function requestOrigin() {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const protocol =
    headerList.get("x-forwarded-proto") ??
    (host?.startsWith("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}
