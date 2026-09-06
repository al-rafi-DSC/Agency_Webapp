# AGENTS.md — rules for AI agents working in this repo

Read by Builder.io Fusion, Claude Code, and any other coding agent. `CLAUDE.md`
holds project context; `PRD.md` holds product detail. **This file is the
contract for what an agent may and may not change.**

## What this app is

Internal workspace for a study-abroad agency. An Admin (the owner) sees every
student and staff member; Staff see only the students assigned to them;
a Superadmin (developer) route exists but is deliberately absent from
navigation. Full detail in `PRD.md`.

## The one rule that matters most

**Fusion draws. Code decides.**

Generated UI renders data that is handed to it as typed props. It never
decides who is allowed to see that data. All access control lives in Supabase
Row Level Security policies at the database layer — never in a component, never
in a `if (user.role === "admin")` check that a generated screen invents.

Hiding a column, a row, or a nav link is **presentation**. It is not security.

## File ownership

### ✅ Generated UI may create and edit

- `src/components/**` — presentational components
- `src/app/**/page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx` — screen layout
- `src/app/globals.css` — styling
- `public/**` — static assets

### ⛔ Hand-written only — do not create, edit, or delete

- `src/lib/supabase/**` — all database and auth clients
- `src/proxy.ts` — session refresh and route protection
- `supabase/**` — schema migrations and RLS policies
- `**/actions.ts`, `src/app/api/**` — Server Actions and route handlers
- `scripts/**`, `.github/**` — tooling and CI guardrails
- Any route under a `superadmin` path

If a task seems to require changing a file in the second list, **stop and say
so** instead of editing it. That signal is the point of the boundary.

## How to build a screen

```
Server Component  →  fetch  →  typed props  →  presentational component
```

`src/app/(admin)/admin/students/page.tsx` is the worked example. Copy its shape.

1. The page is an `async` Server Component. It fetches, and does nothing else.
2. Fetching today means calling `getMock*` from `@/lib/mock/students`.
   **Use the mock fixtures.** Do not write Supabase queries — the real data
   layer is wired by hand in Phase 3, and the fetch call is the only line that
   changes when it is.
3. The component receives typed props from `@/types/db` and renders. It is not
   `async`, imports nothing from `@/lib/supabase/**`, and performs no I/O.
4. Every list gets an explicit empty state. Every route that awaits data gets a
   `loading.tsx`.

## Conventions

- **Next.js 16, App Router, React 19, TypeScript strict.** Server Components by
  default; add `"use client"` only for genuine interactivity.
- **Tailwind v4 + shadcn/ui** (base-nova style, neutral base, lucide icons).
  Compose the existing primitives in `src/components/ui/**` — do not hand-roll a
  button, dialog, or table, and do not add another component library.
- **Imports** use the `@/*` alias, never deep relative paths.
- **Status values** come from `@/types/db` and render through the
  `*_STATUS_LABELS` maps. Never print a raw `snake_case` value to a user, and
  never hard-code a status string in a component.
- **Dates** format with an explicit locale and `timeZone: "UTC"` so server and
  client markup agree.
- **Naming:** files `kebab-case.tsx`, components `PascalCase`, database columns
  `snake_case`.

## Secrets

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — safe in the
  browser. Still fully governed by RLS, for **writes as well as reads**.
- `SUPABASE_SERVICE_ROLE_KEY` — **bypasses RLS entirely.** Server-only, and
  used only through `src/lib/supabase/admin.ts`. Never in a Client Component,
  never in a `NEXT_PUBLIC_` variable, never in a Fusion environment.
- Never commit a `.env*` file. Never paste a real key into a chat or a prompt.

## Open questions — do not invent answers

`PRD.md` §10 lists these as unresolved. Surface the question; don't pick:

- How students are assigned to staff.
- The exact wording of `application_status` and `scholarship_status`. The
  unions in `src/types/db.ts` are **placeholders** — do not write a migration,
  enum, or CHECK constraint against them.
- Whether real payment processing is ever in scope (v1 tracks fee status only).

## Running it

```bash
npm run dev          # http://localhost:3000
npm run guardrails   # security checks (also runs in CI on every PR)
npm run build
```

To browse auth-gated screens with **no Supabase project and no login**, set
`NEXT_PUBLIC_UI_PREVIEW=true` in `.env.local`. It is ignored in production
builds. This is the intended mode for UI work.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
