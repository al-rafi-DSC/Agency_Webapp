# Agency Workspace

Internal workspace for a study-abroad/education agency. The owner (Admin)
monitors the full application pipeline; staff manage only the students assigned
to them, scoped at the database layer by Supabase Row Level Security.

- **`PRD.md`** — what the product is, and what is still undecided.
- **`CLAUDE.md`** — project context and constraints.
- **`AGENTS.md`** — the rules AI agents work under. Read this before changing code.
- **`supabaseauth.md`** — how authentication, roles and RLS actually work.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · shadcn/ui ·
Supabase (Postgres, Auth, Storage) · Vercel · Builder.io Fusion for UI generation.

Production runs on Vercel at `app.ituniconsultancy.com`. Hostinger provides the
domain, DNS and business email (SMTP) for it — not the application runtime. The
apex `ituniconsultancy.com` is an unrelated website belonging to the domain
owner; leave it alone.

## Getting started

```bash
npm install
cp .env.example .env.local
npm run dev
```

`.env.local` ships with `NEXT_PUBLIC_UI_PREVIEW=true`, which renders every
screen from the mock fixtures in `src/lib/mock/` — no Supabase project, no
login. That is the intended mode for UI work. Set it to `false` once real
Supabase credentials are in place; it is ignored in production builds either way.

Then open <http://localhost:3000/admin/students> — the reference screen.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run guardrails` | Security boundary checks (also runs in CI) |
| `npm run verify` | Guardrails + typecheck + lint |
| `npm run build` | Production build |

## How the code is organised

```
src/
  app/                     routes — Server Components that fetch and pass props down
    (admin)/admin/students/  ★ reference screen: copy this shape
  components/              presentational components (props in, markup out)
    ui/                    shadcn/ui primitives
  lib/
    mock/                  fixtures used only in development preview mode
    supabase/              ⛔ hand-written data + auth clients
    auth/                  ⛔ getSessionUser(), role gates, auth messages
  types/db.ts              domain types (PRD §5)
  proxy.ts                 ⛔ session refresh + fail-closed route protection
supabase/                  ⛔ migrations, RLS policies, bootstrap seed
scripts/check-guardrails.mjs  enforces the ⛔ boundaries in CI
```

**Fusion draws, code decides.** Generated UI renders typed props; it never
decides who may see them. Access control lives in RLS policies, not components.
The full boundary is in `AGENTS.md`.

## Status

Authentication and the Worker, Student and Yearly Summary data layers are
implemented. Apply the new migrations before using real records:
**[Workspace setup](supabase/WORKSPACE_SETUP.md)**.

Workers have employment details; students support multiple assigned workers,
editable university applications, notes and private documents. Yearly reports
use database-recorded history and preserve approved snapshots with versioning.
Application and scholarship labels are configured by the Admin in Settings;
the illustrative preview statuses are not seeded into the database.

Production data reads use `src/lib/supabase/workspace.ts` with the signed-in
account and database RLS. Development preview still uses sample fixtures and
explicitly refuses writes. `npm run test:database` verifies migrations, access
policies and report behavior locally; CI runs it alongside the existing checks.
