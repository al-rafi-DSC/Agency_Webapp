# CLAUDE.md

This file gives Claude Code persistent context for this project. Read
`PRD.md` alongside this for full product detail — this file is about how to
work in the codebase, not what the product does.

## Project

Internal workspace for a study-abroad/education agency. The owner (Admin)
hires and monitors staff, who each manage an assigned subset of students
through a per-university application pipeline. Full detail in `PRD.md`.

## Stack

- **Next.js** (App Router) — deployed on **Vercel**, auto-deploy from `main`.
- **Supabase** — Postgres database, Auth, and Storage.
- **Builder.io (Fusion)** — connected to this GitHub repo for AI-assisted UI
  generation/editing. It opens PRs against this repo — review them like any
  other contributor's PR, don't assume Fusion-generated code is automatically
  correct or automatically respects RLS (see Security Rules below).
- **GitHub** — source of truth. Default branch is `main`.

## Local Environment

- **OS:** Windows 11. **Shell:** PowerShell is primary; a Bash tool is also
  available. Each takes its own syntax — don't mix them. In Windows
  PowerShell 5.1 the `&&` and `||` chain operators are a **parser error**;
  use `cmd; if ($?) { next }` instead, or run the command through Bash.
- Paths contain spaces (`Data Desktop`, `Data_Analysis`). Quote them.

## Roles & Access — do not regress on this

- **Admin:** full visibility into all students and staff.
- **Staff:** only their assigned students. This MUST be enforced via
  **Supabase Row Level Security policies**, not just conditional UI
  rendering or app-level `if` checks. Any new table holding student data
  needs an RLS policy before it ships, not after.
- **Superadmin (developer):** full access, disclosed to the owner, but not
  linked anywhere in the Admin or Staff UI/nav. Treat this role's route as
  unlisted, not undocumented — it should still show up in code review, just
  not in the product navigation.

## Environment Variables

Names only — actual values live in `.env.local` (gitignored) and in
Vercel's Environment Variables dashboard for production. Never hardcode or
commit real values, and never ask for them to be pasted into chat.

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — safe client-side; all access, **reads and
  writes alike**, is governed by RLS policies. This key is not read-only: it
  can insert, update, and delete anywhere a policy permits, so write policies
  need the same scrutiny as read policies.
- `SUPABASE_SERVICE_ROLE_KEY` — **server-only**. Bypasses RLS entirely.
  Never in client components, never in anything shipped to the browser.
- `NEXT_PUBLIC_BUILDER_API_KEY` — Builder.io public key, safe client-side.
- `BUILDER_PRIVATE_KEY` — only if Builder's write API is used; **server-only**.
- Model provider key for the Vercel AI SDK — not yet decided (Phase 2,
  see PRD §11).

## Constraints to Respect (free-tier reality)

These aren't hypothetical — they will actually bind on the current plan:

- Supabase free tier: 500MB database, 1GB file storage, project **pauses
  after 7 days of inactivity**. Don't design around unlimited storage —
  student photos/documents will hit the cap before the database does.
- Vercel Hobby: **10-second function timeout**, no long-running background
  jobs. Anything like scheduled digests or bulk processing needs to either
  finish well under 10s or move outside Vercel entirely.
- Supabase's default auth mailer is capped around 2 emails/hour. Custom SMTP
  must be configured before invite/reset emails are relied on for real use.

## Security Rules

- Never commit `.env*` files.
- `SUPABASE_SERVICE_ROLE_KEY` and `BUILDER_PRIVATE_KEY` are server-only,
  full stop.
- No public self-signup — accounts are created only via Admin invite
  (Supabase Auth admin API).
- Every new query path touching student data needs to be checked against
  RLS, not assumed safe because the UI hides it.

## Data Model

See `PRD.md` §5 for the full sketch (Student, UniversityApplication, Staff).
Note: the specific status enum values (`application_status`,
`scholarship_status`) are placeholders pending confirmation — don't treat
them as final when writing migrations.

## Known Open Decisions — don't assume answers

Do not silently pick an answer for these while coding; surface the question
instead:

- Student-to-staff assignment rules (not yet defined).
- Whether real payment processing is ever in scope, or fee tracking stays
  status-only.
- Exact wording/values for application and scholarship status fields.
- Which screens are built via Builder.io Fusion vs. hand-written directly.

## Conventions

_To be filled in once the codebase exists — naming conventions, folder
structure, and commit style will go here._

## Commands

_To be filled in once `package.json` exists — expect the usual `npm
install`, `npm run dev`, `npm run build` pattern for a Next.js app._