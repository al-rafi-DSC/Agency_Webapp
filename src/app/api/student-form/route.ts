/**
 * Receives one response from the agency's student Google Form.
 *
 * The form's Apps Script (`scripts/student-google-form.gs`) posts here on every
 * submission. The route needs no session and no secret — the sender is a
 * Google server, not a signed-in person — so it is treated as public, exactly
 * like the staff details form:
 *
 *   - it can only queue a row the Admin reviews; it never creates a student
 *     file and never reads anything back;
 *   - the database function it calls validates again and caps the queue;
 *   - the reply never says anything about existing records.
 *
 * It accepts whatever questions the form has. Name, email and phone are picked
 * out by question title as a convenience for the Admin's list; the full set of
 * answers is what is stored and shown.
 */

import { createClient } from "@/lib/supabase/server";
import { isUiPreview } from "@/lib/supabase/env";

const MAX_BODY = 60_000;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Questions about someone other than the student, or about an institution. */
const NOT_THE_STUDENT = /father|mother|parent|guardian|spouse|husband|wife|emergency|referee|university|school|college|institut/i;

type Answer = { question: string; answer: string };

function reply(status: number, body: { ok: boolean; error?: string }) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function toText(value: unknown): string {
  if (Array.isArray(value)) return value.map(toText).filter(Boolean).join(", ");
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value).trim();
  return "";
}

function readAnswers(value: unknown): Answer[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 100).flatMap((item) => {
    if (typeof item !== "object" || item === null) return [];
    const { question, answer } = item as Record<string, unknown>;
    const title = toText(question).slice(0, 300);
    return title ? [{ question: title, answer: toText(answer).slice(0, 4000) }] : [];
  });
}

function pick(answers: Answer[], title: RegExp, valid: (answer: string) => boolean = Boolean) {
  return answers.find((a) => title.test(a.question) && !NOT_THE_STUDENT.test(a.question) && valid(a.answer))?.answer ?? "";
}

export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > MAX_BODY) return reply(413, { ok: false, error: "The form response is too large." });

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) throw new Error();
    body = parsed as Record<string, unknown>;
  } catch {
    return reply(400, { ok: false, error: "Send the form response as JSON." });
  }

  const answers = readAnswers(body.answers);
  if (answers.length === 0) return reply(400, { ok: false, error: "The form response has no answers." });

  // Google can collect the respondent's address itself; prefer it when sent.
  const respondent = toText(body.email);
  const email = EMAIL.test(respondent) ? respondent
    : pick(answers, /e-?mail|gmail/i, (a) => EMAIL.test(a)) || (answers.find((a) => EMAIL.test(a.answer))?.answer ?? "");
  const fullName = pick(answers, /\bname\b/i);
  const phone = pick(answers, /phone|mobile|whats\s?app|contact|cell/i, (a) => a.replace(/\D/g, "").length >= 6);

  if (isUiPreview()) return reply(200, { ok: true });

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_student_form", {
    p_full_name: fullName,
    p_email: email,
    p_phone: phone,
    p_answers: answers,
  });

  if (error) {
    console.error("Student form intake failed:", error.code, error.message);
    return reply(503, { ok: false, error: "The response could not be saved right now." });
  }

  return reply(200, { ok: true });
}
