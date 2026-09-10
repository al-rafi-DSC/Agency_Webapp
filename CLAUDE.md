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
  Production domain is **`ituniconsultancy.com`**, registered at Hostinger —
  see "Domain & Email (Hostinger)" below. Vercel runs the app; Hostinger only
  serves DNS and mailboxes.
- **Supabase** — Postgres database, Auth, and Storage.
- **Builder.io (Fusion)** — connected to this GitHub repo for AI-assisted UI
  generation/editing. It opens PRs against this repo — review them like any
  other contributor's PR, don't assume Fusion-generated code is automatically
  correct or automatically respects RLS (see Security Rules below).
- **GitHub** — source of truth. Default branch is `main`.

## Domain & Email (Hostinger)

The domain `ituniconsultancy.com` and its mailboxes are at Hostinger. The
application is not, and should not be planned onto it. The Hostinger plan on
this account is **Premium Web Hosting** — shared managed hosting that serves
PHP and static files, with no persistent Node process and no root access. It
cannot run a Next.js server. Self-hosting would require a Hostinger VPS, which
is a separate purchase and was not pursued (see Known Open Decisions).

- **DNS** is managed in Hostinger (Domains → DNS / Nameservers). The apex is to
  be pointed at Vercel — **not yet done**; the domain is currently unused, so no
  existing site is at risk. When editing DNS, leave the `MX` and mail-related
  `TXT` records alone — they belong to the mailboxes below, and removing them
  silently breaks email.
- **Email** is Hostinger **Premium Business Email** on the same domain, which
  supplies real SMTP (`smtp.hostinger.com`, port 465 SSL or 587 STARTTLS,
  username = the full address). This is what Supabase Auth's custom SMTP should
  point at — see Constraints below.
- Hostinger passwords follow the same rule as every other secret in this
  project: never in the repo, never pasted into chat. The SMTP password goes
  directly into the Supabase dashboard.

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

- `NEXT_PUBLIC_SUPABASE_URL` — **origin only**, no `/rest/v1` suffix.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (new format, `sb_publishable_…`) or
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` (legacy JWT) — the code accepts either,
  preferring the first. Safe client-side; all access, **reads and writes
  alike**, is governed by RLS policies. Not read-only: it can insert, update,
  and delete anywhere a policy permits, so write policies need the same
  scrutiny as read policies.
- `SUPABASE_SECRET_KEY` (new format, `sb_secret_…`) or
  `SUPABASE_SERVICE_ROLE_KEY` (legacy JWT) — **server-only**, either name.
  Bypasses RLS entirely. Never in client components, never in anything shipped
  to the browser. `npm run guardrails` enforces both names identically.
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
  The Hostinger Premium Business Email account on `ituniconsultancy.com` covers
  this — configure it under Supabase → Authentication → SMTP Settings.
  **Not yet wired up.**

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

## Auth — built, see `supabaseauth.md`

Supabase Auth is wired up. The parts worth knowing before touching anything
near it:

- **The role lives in `public.profiles`, never in user metadata.** A signed-in
  user can rewrite their own `raw_user_meta_data` with only the publishable
  key, so a role stored there is a self-service promotion to admin. Guardrail
  `role-from-user-metadata` fails the build if anything reads one.
- `authenticated` has **no `UPDATE` privilege on `profiles.role`** — a
  column-level grant, because an RLS policy governs rows, not columns.
- Read the signed-in account through `getSessionUser()` in
  `@/lib/auth/session`. Nothing else. It handles preview mode and refuses
  deactivated accounts.
- **One place decides "is this person signed in?"** — the pages. `src/proxy.ts`
  only checks that a session exists; it never checks roles and never redirects
  a signed-in visitor. Adding either back creates a redirect loop for
  deactivated accounts.
- Every auth failure message is in `@/lib/auth/messages`. Sign-in returns the
  same string for a wrong password and an unknown address, on purpose — the
  login page is public.
- Student rows are **still fixtures**. Identity is real; the data layer is not.

## Known Open Decisions — don't assume answers

Do not silently pick an answer for these while coding; surface the question
instead:

- Whether real payment processing is ever in scope, or fee tracking stays
  status-only.
- Exact wording/values for application and scholarship status fields.
- Which screens are built via Builder.io Fusion vs. hand-written directly.
- The superadmin route's path (PRD §4.3 — unlisted but disclosed). The role
  exists and has full access; the route does not.

**Resolved 2026-09-10** — hosting: the app **stays on Vercel**. Hostinger
supplies the domain (`ituniconsultancy.com`) and business email only. Moving
the runtime to Hostinger was considered and ruled out — the account's Premium
Web Hosting plan is shared hosting and cannot run a Next.js server. A Hostinger
VPS would be required to self-host; that was not pursued, and reopening it is a
deliberate decision, not a default.

**Resolved 2026-09-07** — student-to-staff assignment: **many-to-many**
(a `student_staff_assignments` join table, not a column on `students`),
assigned manually by Admin. Staff departure raises an Admin alert for manual
reassignment rather than cascading. Staff see only their assigned students —
nothing about unassigned ones, not even names.

## Conventions

**`AGENTS.md` is the authoritative version** — it holds the file-ownership
boundary between generated and hand-written code, and Builder.io Fusion reads
it too (along with `.builderrules`). Summary:

- Next.js 16 App Router (note: `middleware.ts` is now **`src/proxy.ts`**),
  React 19, TypeScript strict, Tailwind v4, shadcn/ui (base-nova, neutral).
- Pages are `async` Server Components that fetch and pass typed props down;
  components in `src/components/**` are presentational — no data access.
- Screens currently render from mock fixtures in `src/lib/mock/`. Real
  Supabase queries get wired in by hand in Phase 3.
- Imports via the `@/*` alias. Files `kebab-case`, components `PascalCase`,
  DB columns `snake_case`.
- Reference screen to copy: `src/app/(admin)/admin/students/page.tsx`.

Hand-written only, never generated: `src/lib/supabase/**`, `src/proxy.ts`,
`supabase/**`, `**/actions.ts`, `src/app/api/**`, `scripts/**`, `.github/**`,
and any superadmin route. `npm run guardrails` enforces the security-relevant
parts of that boundary mechanically; CI runs it on every PR.

## Commands

```bash
npm install
npm run dev          # http://localhost:3000
npm run guardrails   # security boundary checks — also runs in CI
npm run verify       # guardrails + typecheck + lint
npm run build
```

`.env.local` ships with `NEXT_PUBLIC_UI_PREVIEW=true`, which renders every
screen from mock fixtures with no Supabase project and no login — the intended
mode for UI work. It is hard-gated off in production builds.