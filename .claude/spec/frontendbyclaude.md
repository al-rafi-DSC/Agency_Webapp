# Frontend Spec — `frontendbyclaude`

Hand-written frontend for **Agency Workspace**, built in place of Builder.io
Fusion. Branch: `frontendbyclaude`. Source of truth for product detail is
`PRD.md`; the code-ownership contract is `AGENTS.md`; project context is
`CLAUDE.md`. Where this spec and those files disagree, **those files win**.

---

## 1. Objective

Ship the complete v1 UI for the Agency Workspace — Admin and Staff surfaces —
rendering entirely from the mock fixtures in `src/lib/mock/`, with no Supabase
queries and no auth wiring. Quality bar: a product that looks and feels like a
paid internal SaaS tool, not a scaffold.

The deliverable is the **presentation layer**. Phase 3 swaps each page's single
`getMock*()` call for a Supabase query, and nothing above that line changes.

---

## 2. Non-negotiable constraints (from `AGENTS.md`)

These are inherited, not chosen. Violating one fails `npm run guardrails` or CI.

**Will not be created or touched on this branch:**

| Path | Why |
|---|---|
| `src/lib/supabase/**` | Data + auth clients — hand-written, Phase 3 |
| `src/proxy.ts` | Session refresh / route protection |
| `supabase/**` | Schema + RLS policies |
| `**/actions.ts`, `src/app/api/**` | Server Actions and route handlers |
| `scripts/**`, `.github/**` | Tooling and CI guardrails |
| any `superadmin` route | PRD §4.3 — unlisted, hand-written, out of the UI lane |

**Structural rules the UI must follow:**

1. `Server Component → fetch → typed props → presentational component`.
   Pages are `async`, fetch via `getMock*`, and do nothing else.
2. Components under `src/components/**` never fetch, never import
   `@/lib/supabase/**`, never decide who may see data.
3. `"use client"` only for genuine interactivity (filtering, nav toggles,
   theme switch, tab state). Everything else stays a Server Component.
4. Status values render through `*_STATUS_LABELS` from `@/types/db`.
   No raw `snake_case` reaches a user; no status string is hard-coded.
5. Dates format via `Intl.DateTimeFormat` with an explicit locale and
   `timeZone: "UTC"` so server and client markup agree (no hydration errors).
6. Every list has an explicit empty state. Every async route has `loading.tsx`.
7. Compose the existing `src/components/ui/**` primitives (shadcn `base-nova`,
   Base UI underneath). No second component library, no hand-rolled button.
8. Imports use the `@/*` alias. Files `kebab-case`, components `PascalCase`.

**Security posture restated:** hiding a column, a row, or a nav link is
presentation. It is *not* access control. Staff scoping is enforced by Row
Level Security at the database (PRD §7). Nothing on this branch may be relied
on as a security boundary.

---

## 3. Open questions — surfaced, not answered

`PRD.md` §10 leaves these unresolved. This branch does **not** pick an answer:

- **Student to staff assignment rules.** The UI ships a manual "Assign staff"
  control (Admin-only) and no auto-assignment logic of any kind.
- **Exact `application_status` / `scholarship_status` wording.** The UI reads
  labels from `@/types/db` — the placeholder set — so confirmed wording becomes
  a one-file change with zero screen edits. No migration, enum, or CHECK
  constraint is written against them.
- **Payment processing.** `admission_confirmed` renders as a status only.
  No payment form, no amount field, no currency, no processor.

---

## 4. Design system

The current palette is fully greyscale, so every status badge reads at the same
weight. That is the single biggest quality gap. Fixed first.

**Tokens** (`src/app/globals.css`, light and dark both defined explicitly):

- **Brand primary** — indigo. Primary actions and active nav only.
- **Semantic set** — `--success`, `--warning`, `--info`, `--destructive`, each
  with a `-foreground` and a low-chroma soft surface for badge fills.
- **Chart ramp** — `--chart-1..5` replaced with a real sequential ramp for the
  pipeline and workload visuals.
- Radius, spacing, and type scale stay on the existing base.

**Status to colour mapping** (semantic, not decorative):

| Field | Value | Reads as |
|---|---|---|
| application | not started / in progress / submitted / under review | muted / info / primary / warning |
| decision | pending / accepted / rejected | muted / success / destructive |
| scholarship | not applied / applied / awarded / denied | muted / info / success / destructive |
| admission | confirmed / not confirmed | success / muted |

**Motion and feel:** 150–200ms ease-out transitions on hover, focus, and
popover entry (`tw-animate-css`, already installed). Visible focus rings are
kept — polish never removes a keyboard affordance. Skeletons match the shape of
the content they replace, so nothing jumps on load.

**Dark mode:** `next-themes` (already a dependency), class strategy,
`suppressHydrationWarning` on `<html>`, system default with a manual toggle.

**No charting library.** Distribution bars, the pipeline donut, and workload
meters are hand-built SVG/CSS — theme-aware, zero new dependencies, and they
render without client-side JS.

---

## 5. Information architecture

```
/                          → role entry (preview) / role redirect target
/login                     → sign-in form (UI only — no auth wiring)
/forgot-password           → reset request form (UI only)

(admin)
  /admin                   → Dashboard: KPIs, pipeline, staff workload, activity
  /admin/students          → All student files — search, filter, sort
  /admin/students/new      → Open a new student file (form UI)
  /admin/students/[id]     → Student detail: profile, applications, activity
  /admin/applications      → Every university application, cross-student
  /admin/staff             → Staff directory + workload
  /admin/staff/[id]        → Staff member + their assigned students
  /admin/settings          → Workspace/account preferences (UI only)

(staff)
  /staff                   → My dashboard — caseload and what needs action
  /staff/students          → My assigned students
  /staff/students/[id]     → Student detail (same components, staff routes)
```

**Superadmin is deliberately absent** — from the routes above and from every
nav element. PRD §4.3 and `AGENTS.md` put it in the hand-written lane, so it is
raised here rather than built.

---

## 6. App shell

One shell, two role configurations, driven by a typed nav config:

- **Sidebar** — collapsible (icon rail ↔ full), grouped sections, active-route
  highlighting, collapse state persisted per viewer.
- **Topbar** — breadcrumbs, search entry, theme toggle, user menu.
- **Mobile** — the sidebar becomes an overlay drawer below `md`; no horizontal
  page scroll at 360px.
- **Role scoping here is presentational.** The staff nav omits the Staff and
  Settings links because staff have no use for them — not because the omission
  protects anything.

---

## 7. Screen inventory

**Admin dashboard** — stat tiles (total students, active applications,
acceptances, unassigned files); application-status distribution; decision
funnel; staff workload meters; recent activity; an unassigned-students callout
that links straight into assignment.

**Students list** — searchable, filterable (status, decision, assigned staff,
unassigned), sortable; table and card views; per-row quick actions; distinct
empty states for "no students yet" and "no results for this filter".

**Student detail** — identity header (photo, file-opened date, assigned staff,
reassign control); per-university application cards showing application status,
decision, scholarship, admission-confirmed, and the application link;
`admission_confirmed` is visually gated behind `decision_status === "accepted"`
per PRD §5.2; activity timeline; documents panel (UI shell only — Storage is
Phase 3); notes panel.

**New student file** — form UI over the PRD §5.1 fields, with client-side
validation and disabled/submitting states only. No submit handler and no Server
Action — a clearly marked seam where the hand-written action lands.

**Applications** — every `UniversityApplication` across students in one
filterable table, grouped by decision, showing the owning student and staff.

**Staff directory / detail** — roster with caseload counts and workload bars;
detail shows that staff member's students and their pipeline mix.

**Staff dashboard / list / detail** — the same components as Admin, minus the
assigned-staff column, plus a "needs attention" queue (stalled applications,
accepted-but-unconfirmed admissions).

**Login / forgot password** — polished, accessible forms. Copy states plainly
that accounts are invite-only and that there is no public sign-up (PRD §7).

**Every route** additionally ships a `loading.tsx` with a shape-matched
skeleton, an empty state, and `not-found` / `error` boundaries where the route
takes an id.

---

## 8. Mock fixtures

`src/lib/mock/` is extended, not replaced — existing exports keep working:

- ~14 students across 5 staff, including unassigned files, students with no
  applications, and every status combination, so no UI state is unexercised.
- Activity events and notes, for the timeline and the dashboard feed.
- Derived read-only selectors (`getMockDashboardStats`, `getMockStaffWorkload`,
  `getMockApplications`, …) so pages stay thin and components stay dumb.
- All selectors are `async`, matching the existing signatures, so the Phase 3
  swap stays a one-line change per screen.

Fixtures remain fake data only — no network call ever lands in this directory.

---

## 9. New UI primitives

Added via the shadcn CLI where it is available, hand-written into
`src/components/ui/**` in the same `base-nova` idiom if it is not: `tabs`,
`tooltip`, `popover`, `progress`, `textarea`, `checkbox`, `switch`,
`breadcrumb`, `alert`, `scroll-area`, `sheet`/drawer. No dependency outside the
existing Base UI + Tailwind + lucide stack.

---

## 10. Execution phases

| # | Phase | Output |
|---|---|---|
| A | Design system | tokens, theme provider, dark mode, new primitives |
| B | App shell | sidebar, topbar, nav config, mobile drawer, breadcrumbs |
| C | Fixtures | expanded mocks + derived selectors |
| D | Admin screens | dashboard, students, detail, new, applications, staff, settings |
| E | Staff screens | dashboard, list, detail, needs-attention queue |
| F | Auth screens | login, forgot password (UI only) |
| G | Polish | loading/empty/error states, responsive + a11y pass |
| H | Verify | `npm run verify`, `npm run build`, dev-server smoke test |

---

## 11. Definition of done

- `npm run guardrails` — clean, no boundary violation.
- `npm run typecheck` — clean under `strict`.
- `npm run lint` — clean.
- `npm run build` — production build succeeds.
- The dev server renders every route in `NEXT_PUBLIC_UI_PREVIEW=true` mode,
  with no Supabase project and no login.
- No console errors and no hydration warnings on any route.
- Keyboard navigable: visible focus on every interactive element; nav, menus,
  and dialogs reachable and dismissable without a mouse.
- Light and dark both deliberate — no unstyled or inverted-looking surface.
- Usable at 360px with no horizontal page scroll.
- Not one Supabase import outside `src/lib/supabase/**`.

---

## 12. Explicitly out of scope

Auth wiring · Server Actions and route handlers · Supabase queries, schema, and
RLS policies · file upload to Storage · the superadmin route · real payment
processing · AI features (PRD §11) · the public marketing site.

---

## 13. Build record (2026-09-07)

Every screen in the inventory is built and rendering from mock fixtures.

**Routes (15):** `/` · `/login` · `/forgot-password` · `/admin` ·
`/admin/students` · `/admin/students/new` · `/admin/students/[id]` ·
`/admin/applications` · `/admin/staff` · `/admin/staff/[id]` ·
`/admin/settings` · `/staff` · `/staff/students` · `/staff/students/[id]` ·
root `not-found`. Every async route has a `loading.tsx`; both id routes have a
`not-found.tsx`; both route groups have an `error.tsx`.

### Verified

| Check | Result |
| --- | --- |
| `npm run guardrails` | pass (103 files) |
| `npm run typecheck` | pass |
| `npm run lint` | pass, zero warnings |
| `npm run build` | pass, 14 routes prerendered/compiled |
| Route walk (dev, `NEXT_PUBLIC_UI_PREVIEW=true`) | all 200; `/nope` 404 |
| Not-found paths | missing student, missing staff, and a student not assigned to the previewing staff account all render the right screen |
| Supabase imports under `src/app`, `src/components` | none |
| Dev server log | zero errors, zero hydration warnings |

### Not verified

- **Visual pass in a browser** — light/dark rendering and the 360px layout were
  not opened in a browser. Responsive intent is in the markup (mobile-first
  grids, every table inside `overflow-x-auto`, no fixed width above 288px) and
  the static audit found nothing that overflows, but nobody has looked at it.
- **Production-mode serving** — `next start` refuses to serve without real
  Supabase environment variables, because `NEXT_PUBLIC_UI_PREVIEW` is hard-gated
  off in production builds by `src/proxy.ts` (hand-written, working as designed).
  So the `notFound()` HTTP status could only be confirmed in dev, where Next
  streams the shell first and returns 200 with the not-found body.

### Two constraints found while building

Both are React Server Component boundary rules, and both changed a prop shape:

1. A **component cannot be passed as a prop** from a Server Component to a
   Client Component. `AppShell` therefore takes a `navKey` string and looks the
   sections up itself, because `NavItem.icon` is a component.
2. A **function cannot cross that boundary** either. The client explorers take
   `studentBasePath` (a string) instead of a `buildHref` callback. Server-side
   components still take callbacks — the rule only binds at the boundary.

### Deliberately still open

`superadmin` route (out of scope on this branch, per the decision recorded in
§12 — it needs to be raised as separate work) · assignment rules · payment
scope · confirmed status wording. Nothing in this branch answers any of them.
