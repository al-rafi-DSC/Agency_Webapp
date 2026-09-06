# Product Requirements Document — Agency Workspace

Status: Draft v1 — for planning, not yet build-ready (see §10 Open Questions)

## 1. Problem Statement

The agency owner currently runs a study-abroad/education agency solo. He is
hiring staff to help process student applications, but has no shared system —
he needs a single tool where he can both **delegate work to staff** and
**monitor the full pipeline** (staff workload and student progress) without
relying on staff to report status manually.

## 2. Goals

- Give the owner (Admin) full visibility into every student's application
  status and every staff member's workload, in one place.
- Give staff a focused workspace to manage only the students assigned to them.
- Make student progress trackable per-university, since one student can apply
  to multiple universities in parallel with independent statuses.
- Keep a hidden, disclosed super-admin path for the developer for support and
  maintenance, without exposing it in the normal UI.

## 3. Non-Goals (v1)

Explicitly out of scope for the first build — listed so nobody assumes these
are silently included:

- **Automated student-to-staff assignment.** Assignment is manual by Admin in
  v1; matching rules are deferred (owner's own words: "rules for assigned
  will be written later").
- **Real payment processing.** The app tracks *whether* an enrollment fee has
  been paid (a status field), not the actual transaction. Taking real payment
  would mean integrating a payment processor (e.g. Stripe) — a separate,
  larger piece of scope with its own compliance requirements, not assumed here.
- **Public marketing site.** This PRD covers the internal tool only.
- **Dashboard/analytics beyond the views described in §6.** Advanced
  reporting was already deferred once before; no reason to pull it forward now.
- **AI features.** Candidate ideas exist (see §11) but nothing is committed
  for v1.

## 4. User Roles & Permissions

### 4.1 Admin (Owner)
- Sees every student and every staff member — no restriction.
- Sees each student's file-opening date, current university-application
  statuses, and which staff member is assigned.
- Creates staff accounts (invite-only, no public signup).
- Manually assigns students to staff.

### 4.2 Staff
- Equal tier — no seniority/hierarchy among staff accounts.
- Sees only the students assigned to them — enforced at the database level
  (see §7), not just hidden in the UI.
- Manages each assigned student's profile and per-university progress.

### 4.3 Superadmin (Developer)
- Full access to everything, for support/maintenance.
- **Disclosed to the owner** (so its existence isn't a surprise if ever
  noticed or audited) but **not exposed** in the Admin or Staff navigation —
  reachable only via a direct, undocumented route known to the developer.
- This is the "hidden but not secret" version discussed earlier: same
  practical invisibility to staff, without being an undisclosed backdoor into
  a system holding personal student documents.

## 5. Data Model (v1 sketch)

This is a starting sketch, not a final schema — see §10 for the specific
values still needing confirmation.

### 5.1 Student
- `photo`
- `name`
- `file_opened_at` (date, visible to Admin)
- `assigned_staff_id` (set manually by Admin)
- has many `UniversityApplication`

### 5.2 UniversityApplication (belongs to a Student)
One row per university the student is applying to — a student can have
several of these in parallel.
- `university_name` (free text for now — manual entry, e.g. "University of
  Torino"; no university database/lookup in v1)
- `application_link`
- `application_status` (placeholder enum — e.g. Not Started / Submitted /
  Under Review — **needs confirmation, see §10**)
- `decision_status` (Accepted / Rejected / Pending)
- `admission_confirmed` — becomes actionable only after `decision_status =
  Accepted`; tracks whether the enrollment fee has been paid and admission
  confirmed (status field only — no real payment processing, see §3)
- `scholarship_status` (placeholder enum — e.g. Not Applied / Applied /
  Awarded / Denied — **needs confirmation, see §10**)

### 5.3 Staff
- Standard profile fields + Supabase Auth identity
- Implicitly has many assigned `Student` records

## 6. Core User Flows

1. **Admin invites a staff member** → staff receives an email invite, sets
   their own password, logs in to their scoped view.
2. **Admin opens a new student file** → sets `file_opened_at`, fills basic
   profile, assigns a staff member.
3. **Staff opens an assigned student** → adds/edits `UniversityApplication`
   entries as the student applies to more universities or statuses change.
4. **Admin reviews pipeline** → sees all students across all staff, current
   status per university, and can reassign if needed.
5. **Password reset (self-serve)** → handled by Supabase Auth's built-in
   flow, no custom code required (see PRD from earlier discussion).

## 7. Access Control Requirements

Carried over as a hard requirement from the previous build, and stronger
this time:

- Staff visibility into students is enforced via **Supabase Row Level
  Security (RLS) policies** at the database layer — not just hidden UI
  elements. A staff account querying another staff's student directly should
  be denied by the database itself, regardless of which code path is used.
- No public self-signup. Accounts are created only via Admin invite
  (Supabase Auth admin API).

## 8. Tech Stack

- **Next.js** (App Router) — the application itself.
- **Vercel** — hosting/deployment, auto-deploys from GitHub.
- **GitHub** — source of truth repository.
- **Supabase** — Postgres database, Auth (invite-only email/password,
  built-in reset flow), and Storage (student photos, documents).
- **Builder.io (Fusion)** — connects to the GitHub repo to generate and
  visually edit the actual UI (admin dashboard, staff student-profile
  screens) via AI prompts and a visual canvas, opening PRs against the repo.
  Not just a content CMS — genuinely used for building the interface.

## 9. Non-Functional Requirements

Carried forward from the earlier planning discussion — still apply here:

- **Backups:** nightly automated `pg_dump` via a scheduled GitHub Action to
  a private repo (or repo folder), since Supabase's free tier doesn't
  include automatic backups.
- **Free-tier ceilings to watch:** Supabase free tier (500MB DB / 1GB file
  storage, pauses after 7 days of inactivity); Vercel Hobby (10s function
  timeout, single-account access). Student photos + documents will hit the
  1GB storage cap before the database does.
- **Email delivery:** custom SMTP (not Supabase's default limited mailer)
  needed for invite and password-reset emails to be reliable.
- **Maintenance:** lightweight uptime monitoring + error tracking, and a
  clear (if informal) understanding with the owner about response-time
  expectations, since this isn't a paid support contract.

## 10. Open Questions / Decisions Needed Before Build

These are flagged, not resolved — build should not proceed on assumptions
about these:

- **Assignment rules** — how students actually get matched to staff (owner
  said this comes later).
- **Exact status values** for `application_status` and `scholarship_status`
  — the sketch in §5 is a placeholder set, not confirmed wording.
- **Enrollment fee scope** — confirm v1 is status-tracking only, and whether
  real payment processing is a planned Phase 2.
- **Division of labor between Builder.io Fusion and hand-written code** —
  which screens get built visually vs. coded directly.

**Resolved:** *Is this the same codebase as the earlier "Agency Workspace"
build, or a fresh project?* — **Fresh project.** This repository
(`al-rafi-DSC/Agency_Webapp`) was initialized empty on 2026-09-06; no code
carries over from the earlier build. Nothing is reused, so no compatibility
constraints from prior work apply.

## 11. Phase 2 / Future Ideas (not committed)

- AI-assisted features (candidates discussed: applicant note summarizer,
  document field extraction from uploaded transcripts/passports, drafted
  follow-up messages, natural-language search over students) via the Vercel
  AI SDK.
- Public marketing site, where Builder.io's CMS-style editing would suit
  non-technical content updates.
- Configurable (rather than fixed) status/pipeline values, once real usage
  shows what staff actually need.