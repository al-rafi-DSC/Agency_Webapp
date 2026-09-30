"use server";

/**
 * The staff details form — the one write in this app that needs no session.
 * The page is unlisted (the Admin sends the link by hand), but unlisted is not
 * protected: everything below assumes a stranger can reach it.
 *
 * ── What it does NOT do ──────────────────────────────────────────────────────
 * It does not create an account and grants no access. It queues a request the
 * Admin sees on the dashboard; the Admin still creates the account (PRD §7 —
 * no public sign-up). The database function it calls validates the input
 * again, caps the queue, and is the only way the public can write this table.
 *
 * ── The response never varies ────────────────────────────────────────────────
 * Same confirmation whether the address is new, already waiting, or already
 * has an account — see `@/lib/auth/messages`.
 */

import {
  STAFF_REQUEST_INCOMPLETE,
  STAFF_REQUEST_RECEIVED,
  STAFF_REQUEST_UNAVAILABLE,
} from "@/lib/auth/messages";
import { createClient } from "@/lib/supabase/server";
import { isUiPreview } from "@/lib/supabase/env";
import { emailField, textField } from "@/lib/workspace/input";
import { isGender } from "@/types/workspace";

export interface StaffRequestState {
  error: string | null;
  sent: boolean;
  message: string | null;
}

export async function submitStaffRegistrationAction(
  _prevState: StaffRequestState,
  formData: FormData,
): Promise<StaffRequestState> {
  const received = { error: null, sent: true, message: STAFF_REQUEST_RECEIVED };

  // Honeypot: hidden from people, filled in by form-spamming scripts.
  if (String(formData.get("website") ?? "").length > 0) return received;

  let fullName: string, email: string, phone: string, gender: string, address: string;
  try {
    fullName = textField(formData, "full_name", 200, 2);
    email = emailField(formData);
    phone = textField(formData, "phone", 80, 3);
    gender = textField(formData, "gender", 20);
    address = textField(formData, "address", 500, 3);
    if (!email || !isGender(gender)) throw new Error();
  } catch {
    return { error: STAFF_REQUEST_INCOMPLETE, sent: false, message: null };
  }

  if (isUiPreview()) {
    return { error: null, sent: true, message: "Preview mode — nothing was saved." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_staff_registration", {
    p_full_name: fullName,
    p_email: email,
    p_phone: phone,
    p_gender: gender,
    p_address: address,
  });

  if (error) {
    console.error("Staff request failed:", error.code, error.message);
    return { error: STAFF_REQUEST_UNAVAILABLE, sent: false, message: null };
  }

  return received;
}
