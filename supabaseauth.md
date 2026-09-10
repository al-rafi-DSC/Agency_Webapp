# supabaseauth.md — Supabase Auth & Identity Spec

Status: **Built.** Scope is authentication and identity only.
Student/application data stays on the mock fixtures in `src/lib/mock/` — that
swap is a separate piece of work.

Three things changed between this spec and the implementation, each because
building it surfaced something the design had wrong. They are marked
**⟳ CHANGED IN BUILD** where they appear:

1. RLS is `ENABLE`d but not `FORCE`d (§4.3).
2. The proxy does no role routing at all, and no longer bounces signed-in
   visitors from `/login` (§5.7).
3. Invites arrive as a URL *fragment*, not a query parameter, which no server
   code can read (§5.4).

Companion documents: `PRD.md` (product), `CLAUDE.md` (project context),
`AGENTS.md` (file-ownership contract). Where they disagree with this file,
they win — this file adds, it does not override.

---

## 1. What exists today

The app is a complete, working UI that authenticates nobody.

| Piece | State |
| --- | --- |
| `src/lib/supabase/{env,client,server,admin}.ts` | Written, correct, **never called** |
| `src/proxy.ts` | Written — refreshes session, fails closed to `/login`. Never exercised |
| `src/components/auth/login-form.tsx` | Renders; `onSubmit` fires a toast |
| `src/components/auth/forgot-password-form.tsx` | Renders; sets local state |
| `src/components/shell/user-menu.tsx` | "Sign out" is a `<Link href="/login">` |
| `src/app/page.tsx` | Preview switchboard, no session redirect |
| `(admin)` / `(staff)` layouts | Identity from `getMockSessionUser()` |
| `supabase/` directory | **Does not exist.** No schema, no RLS, no migrations |
| `/reset-password` | Listed in `PUBLIC_ROUTES`, **route does not exist** |

Every one of those files carries a "PHASE 3 SEAM" comment naming exactly what
replaces it. This spec is that replacement.

`NEXT_PUBLIC_UI_PREVIEW=true` renders every screen from fixtures with no
Supabase project and no login. **That mode must keep working after this work
lands** — it is how UI is built, including by Builder.io Fusion, and it is
hard-gated off in production by `isUiPreview()`.

## 2. The Supabase project

| | |
| --- | --- |
| Project name | `Agency_Webapp` |
| Project ref | `hqyavenqhutmbiiusrhz` |
| Project URL | `https://hqyavenqhutmbiiusrhz.supabase.co` |
| Publishable key | `sb_publishable_…` (new-format key; browser-safe, RLS-governed) |
| Secret key | **Not supplied, and must not be pasted into a chat.** Copied by the owner from the dashboard straight into `.env.local` and Vercel |

Two notes on the values given:

1. The URL supplied ended in `/rest/v1/`. That is the PostgREST endpoint, not
   the project URL. `NEXT_PUBLIC_SUPABASE_URL` takes the **origin only** —
   `https://hqyavenqhutmbiiusrhz.supabase.co`. `@supabase/supabase-js` appends
   `/rest/v1`, `/auth/v1` and `/storage/v1` itself; leaving the suffix on
   produces `/rest/v1/rest/v1/…` and every call 404s.
2. `sb_publishable_…` is Supabase's **new** API key format, replacing the
   legacy `anon` JWT. It behaves identically for our purposes: browser-safe,
   fully governed by Row Level Security, and **not read-only** — it can
   insert, update and delete anywhere a policy permits. Its privileged
   counterpart is a `sb_secret_…` key, which replaces `service_role` and
   bypasses RLS entirely.

The codebase's existing variable names (`NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`) predate that format change. Rather than a rename
that touches five files and every deployment environment,
`src/lib/supabase/env.ts` will accept **either** name, preferring the new one:

```
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY  ??  NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SECRET_KEY                   ??  SUPABASE_SERVICE_ROLE_KEY
```

`npm run guardrails` is extended to treat `SUPABASE_SECRET_KEY` with exactly
the same suspicion it already applies to `SUPABASE_SERVICE_ROLE_KEY`.

## 3. Principles this spec is bound by

Restated because every design decision below follows from one of them.

1. **The database decides who sees what.** RLS at the data layer, never a
   component, never an `if (user.role === "admin")`. A redirect chooses what
   renders; it never chooses what a query may return. (`AGENTS.md`, PRD §7)
2. **The role is not client-writable.** A signed-in user can rewrite their own
   `raw_user_meta_data` through `supabase.auth.updateUser()` with nothing but
   the publishable key. A role stored there is a self-service promotion to
   admin. The role lives in `public.profiles`, and `authenticated` has no
   `UPDATE` privilege on that column at all.
3. **No public sign-up.** Accounts exist only by Admin invite. This is a
   dashboard setting as much as it is code — see §8.
4. **Auth errors stay vague.** "No such account" and "wrong password" must read
   identically, or the login form becomes an account-enumeration oracle on a
   public page. Same for the password-reset confirmation.
5. **`getUser()`, never `getSession()`** on the server. `getSession()` trusts an
   unverified cookie; `getUser()` revalidates against Supabase.
6. **UI preview mode survives.** Every auth entry point short-circuits on
   `isUiPreview()` before touching Supabase.

## 4. Schema

One migration: `supabase/migrations/0001_auth_identity.sql`.

Deliberately **not** in it: `students`, `university_applications`, or
`student_staff_assignments`. `application_status` and `scholarship_status` are
still open questions (PRD §10) and `AGENTS.md` forbids writing an enum or CHECK
constraint against the placeholder unions in `src/types/db.ts`. Nothing in this
migration depends on them.

### 4.1 Enums

```sql
create type public.user_role      as enum ('admin', 'staff', 'superadmin');
create type public.account_status as enum ('active', 'inactive');
```

`user_role` mirrors `USER_ROLES` in `src/types/db.ts` and is confirmed by PRD
§4 — not a placeholder. `account_status` exists because staff departure must be
representable: the resolved assignment rules say a departing staff member
raises an Admin alert and triggers manual reassignment, which requires a state
for "no longer working here" that is not "deleted".

### 4.2 `public.profiles`

```sql
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  full_name  text not null default '',
  role       public.user_role      not null default 'staff',
  status     public.account_status not null default 'active',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Keyed on `auth.users.id` directly — one profile per account, no separate
`auth_user_id` join key. This means `src/types/db.ts`'s `Staff` interface
(which carries both `id` and `auth_user_id`) will be reconciled against the
real schema; the app-facing `SessionUser` shape in `src/types/ui.ts` already
matches `profiles` field-for-field and does not change.

### 4.3 Row Level Security

**⟳ CHANGED IN BUILD.** RLS is `enable`d on `profiles`, and deliberately **not**
`force`d — the spec originally called for both.

`FORCE` removes the table-owner exemption. The `security definer` helpers below
depend on that exemption to read `profiles` without re-entering the policy that
called them, which is the whole mechanism preventing infinite recursion. Without
`FORCE`, that works because the function executes as the table's owner. With
`FORCE`, it works only if the owner role also carries the `BYPASSRLS`
*attribute* — a property of the managed platform's role setup rather than of
anything in this migration.

Depending on ownership is deterministic; depending on a role attribute is a bet.
And what `FORCE` would actually buy is protection against a compromised owner
connection, which in this project is the same credential that could simply drop
the policies.

Then, before any policy:

```sql
revoke all on public.profiles from anon, authenticated;
grant  select                         on public.profiles to authenticated;
grant  update (full_name, avatar_url) on public.profiles to authenticated;
```

Those column-level grants are the primary defence for principle 2. A policy
governs *which rows* a statement may touch; only a column grant governs *which
columns*. Without it, an UPDATE policy scoped to "your own row" happily permits
`set role = 'admin'` on your own row.

Policies:

| Op | Who | Rule |
| --- | --- | --- |
| `select` | authenticated | own row, **or** caller is admin/superadmin |
| `update` | authenticated | own row only (`using` + `with check`) |
| `insert` | — | no policy. Rows come from the signup trigger only |
| `delete` | — | no policy. Deleting `auth.users` cascades |

Role resolution inside policies uses a `security definer` helper so the policy
on `profiles` does not have to read `profiles` through its own policy and
recurse:

```sql
create function public.current_user_role() returns public.user_role
  language sql stable security definer set search_path = public
  as $$ select role from public.profiles where id = auth.uid() $$;

create function public.is_admin() returns boolean
  language sql stable security definer set search_path = public
  as $$ select coalesce(public.current_user_role() in ('admin','superadmin'), false) $$;
```

`is_admin()` is deliberately the only place the admin test is written. Every
future policy on `students`, `university_applications` and
`student_staff_assignments` calls it rather than re-deriving the test — one
definition, one place to audit, one place to change.

> Not named `current_role()`: `CURRENT_ROLE` is reserved in Postgres.

The role is read from the table, not from `auth.jwt()`. A JWT claim is faster
but goes stale until the access token refreshes, which means a demoted account
keeps admin reads for up to an hour. Correctness wins; these are single-index
lookups on a table with one row per employee.

### 4.4 Triggers

**`on_auth_user_created`** — `after insert on auth.users`, creates the profile.
Role is read from `raw_app_meta_data`, which **only** a secret-key call can
write, and never from `raw_user_meta_data`, which the user can rewrite
themselves. Defaults to `'staff'` if absent — the least-privileged role, so a
mistake fails safe.

**`on_auth_user_email_changed`** — keeps `profiles.email` in step with
`auth.users.email` after a verified email change.

**`profiles_guard_privileged_columns`** — `before update on public.profiles`;
raises if `role` or `status` changed and the caller is not the service role.
Strictly redundant against the column grants in §4.3, and included precisely
for that reason: if a future migration re-grants a column carelessly, the
privilege escalation still fails loudly instead of silently succeeding.

**`profiles_set_updated_at`** — `before update`, maintains `updated_at`.

### 4.5 Bootstrap

The trigger defaults every new account to `staff`, so the first Admin has to be
promoted by hand — exactly once, from the SQL editor:

```sql
update public.profiles set role = 'admin' where email = '<owner@address>';
```

Shipped as `supabase/seed/bootstrap-admin.sql` with the address left blank. It
is not run automatically, and it does not go in a migration: a migration that
hard-codes who the owner is would re-run on every environment.

## 5. Application layer

### 5.1 Files

New, all hand-written (`AGENTS.md` § File ownership):

```
supabase/migrations/20260907120000_auth_identity.sql
supabase/seed/bootstrap-admin.sql
supabase/README.md                        how to apply, both CLI and dashboard

src/lib/supabase/session.ts               getAuthenticatedProfile() — Supabase only
src/lib/auth/session.ts                   getSessionUser(), requireSessionUser(), requireRole()
src/lib/auth/roles.ts                     homePathForRole(), safeRedirectPath()
src/lib/auth/messages.ts                  the deliberately vague error strings

src/app/auth/callback/route.ts            invite + recovery link landing
src/app/auth/sign-out/route.ts            POST -> signOut -> /login
src/app/login/actions.ts                  signInAction
src/app/forgot-password/actions.ts        requestPasswordResetAction
src/app/reset-password/page.tsx           set a new password
src/app/reset-password/actions.ts         updatePasswordAction
src/app/reset-password/session-from-link.tsx   client-side fragment recovery
src/app/(admin)/admin/staff/actions.ts    inviteStaffAction, setStaffStatusAction
src/components/auth/reset-password-form.tsx
src/components/staff/invite-staff-dialog.tsx
```

Two files are split where the spec had one. `src/lib/supabase/session.ts` talks
to Supabase and knows nothing about fixtures or product rules;
`src/lib/auth/session.ts` sits on top and adds the two rules that are product
decisions — preview mode, and refusing an inactive account. Keeping the
Supabase layer free of both means the fixtures are reachable only through a
dynamic `import()` inside the preview branch, so they never enter the
production module graph at all.

`session-from-link.tsx` lives beside its route rather than in
`src/components/`, because `npm run guardrails` forbids components from
importing a Supabase client and this one genuinely must (see §5.4). It is one
step of one route, not a reusable component — colocating it keeps the guardrail
absolute instead of adding the first entry to an allowlist.

Modified:

```
src/lib/supabase/env.ts                  accept new-format key names
src/lib/supabase/admin.ts                accept SUPABASE_SECRET_KEY
src/proxy.ts                             role-aware redirects, inactive block
src/app/page.tsx                         session -> role -> redirect
src/app/(admin)/layout.tsx               real identity + server-side role gate
src/app/(staff)/layout.tsx               real identity + server-side role gate
src/components/auth/login-form.tsx       call the action
src/components/auth/forgot-password-form.tsx
src/components/auth/reset-password-form.tsx   (new, presentational)
src/components/shell/user-menu.tsx       sign out becomes a POST
scripts/check-guardrails.mjs             two new rules
.env.example / .env.local / README.md / CLAUDE.md / AGENTS.md
```

### 5.2 `getSessionUser()`

The single way any server code learns who is signed in.

```
isUiPreview()                            -> return the mock fixture, never touch Supabase
supabase.auth.getUser()                  -> null if no verified session
select * from profiles where id = …      -> SessionUser
no profile row                           -> null (treated as not signed in)
status = 'inactive'                      -> see §9, open question
```

Returns `SessionUser` from `src/types/ui.ts` — the type the shell, the user
menu and every screen already consume. Nothing downstream of it changes shape.

### 5.3 Sign in

`signInAction` (Server Action, `src/app/login/actions.ts`):

1. `signInWithPassword({ email, password })`.
2. On **any** failure — bad password, unknown address, unconfirmed account —
   return the one string from `src/lib/auth/messages.ts`. Never branch the
   message on the error code (principle 4).
3. On success, resolve the profile and `redirect()` to the role's home.
4. Honour `?next=` **only** if it is a same-origin, root-relative path
   (`startsWith("/")`, not `startsWith("//")`) — otherwise an attacker crafts
   `/login?next=https://evil.example` and the login page becomes an open
   redirect. Fall back to the role home.

`login-form.tsx` keeps its current markup, uses `useActionState` for pending
and error state, and keeps its two standing prohibitions: no "create account"
link, no error message that distinguishes the failure modes.

### 5.4 Password reset and invite acceptance

Both land on the same screen, because both end in "choose a password".

```
forgot-password  --resetPasswordForEmail-->  email
invite (admin)   --inviteUserByEmail------>  email
                                              |
                                  /auth/callback?code=… | ?token_hash=…&type=…
                                              |
                                    exchange for a session
                                              |
                                       /reset-password
                                              |
                              updateUser({ password })  ->  role home
```

**⟳ CHANGED IN BUILD: there are three link shapes, not two.**

The spec assumed every link arrives as a query parameter this route can read.
Checking the SDK during implementation turned up this, on `inviteUserByEmail`:

> *PKCE is not supported when using `inviteUserByEmail`. This is because the
> browser initiating the invite is often different from the browser accepting
> the invite.*

Without PKCE the flow falls back to implicit, which returns the session in the
URL **fragment** — `#access_token=…` — and a fragment is never transmitted to
the server. So the single most important flow in this document, an Admin
onboarding their first staff member, would have reached `/auth/callback`, found
no parameters, and reported an invalid link. Every time. Password resets *do*
use PKCE and would have worked fine, which is exactly what makes this the kind
of bug that ships.

| Shape | Sent by | Handled |
| --- | --- | --- |
| `?code=…` | password reset (PKCE) | `exchangeCodeForSession`, server-side |
| `?token_hash=…&type=…` | any flow, once the email templates are customised | `verifyOtp`, server-side |
| `#access_token=…` | **invites**, by default | `src/app/reset-password/session-from-link.tsx`, client-side |

A parameterless request is therefore *not* treated as a failure. It is
forwarded to `next` with the fragment intact — browsers reattach a fragment
across a redirect — and the destination recovers the session in the browser,
scrubs the tokens out of `window.location` (they would otherwise land in
history and in the next `Referer` header), and reloads so the page comes back
server-rendered. `/reset-password` shows "link expired" only after the client
has looked and found nothing.

Customising the email templates to send `?token_hash=…` keeps everything
server-side and is the better configuration — it is in the checklist at §8. The
route works either way, which is the point.

Genuine failures all redirect to `/login?error=link_invalid` — a generic
marker, no detail about why.

`/reset-password` requires a session (the callback just established one) and is
in `PUBLIC_ROUTES` so the proxy does not bounce it. Without a session it renders
"this link has expired" and a link back to `/forgot-password`.

`forgot-password/actions.ts` returns the identical confirmation regardless of
whether the address exists, and does not surface Supabase rate-limit errors —
both leak account existence.

### 5.5 Sign out

`user-menu.tsx`'s `<Link href="/login">` becomes a `<form method="post"
action="/auth/sign-out">`. A GET link cannot end a session, and a GET that
mutates is prefetchable — Next could sign the user out on hover. The route
handler calls `supabase.auth.signOut()`, clears cookies, redirects to `/login`.

### 5.6 Admin invites staff

`inviteStaffAction` — the first legitimate use of the secret-key client
described in `src/lib/supabase/admin.ts`'s header.

```
1. getSessionUser()                          — who is calling
2. role is admin or superadmin, else throw   — CHECKED IN THE ACTION.
                                               The secret key bypasses RLS;
                                               the database will not check
                                               this for us.
3. createAdminClient()
   .auth.admin.inviteUserByEmail(email, {
       data:         { full_name },          -> raw_user_meta_data (display)
       app_metadata: { role: 'staff' },      -> raw_app_meta_data  (authority)
       redirectTo:   `${origin}/auth/callback?next=/reset-password`,
   })
4. trigger writes the profile row
5. revalidatePath('/admin/staff')
```

Step 2 is the whole reason this action is hand-written and guardrail-protected.
`app_metadata` carries the role because it is writable only by a secret-key
call; `user_metadata` carries the display name because nothing
security-relevant may live there.

`setStaffStatusAction` flips `status` between `active` and `inactive` for staff
departure, under the same caller check.

### 5.7 Route protection

Three layers, and the order matters:

| Layer | Enforces | Is it security? |
| --- | --- | --- |
| `src/proxy.ts` | a session exists | No — UX |
| `(admin)` / `(staff)` layout | server-side role gate, redirect on mismatch | Defence in depth |
| RLS policies | which rows any query may return | **Yes. This is the boundary** |

**⟳ CHANGED IN BUILD: the proxy checks roles nowhere, and no longer bounces a
signed-in visitor away from `/login`.**

The spec had the proxy reading the role from a JWT `app_metadata` claim to pick
a redirect at the edge. Writing it exposed a redirect loop that the design could
not survive:

- The proxy can only ask Supabase Auth *"is this cookie valid?"*
- The app asks a stricter question through `getSessionUser()`: valid cookie
  **and** a profile row **and** `status = 'active'`.

A departed staff member holding an unexpired access token answers **yes** to the
first and **no** to the second. The layout would redirect them to `/login`, the
proxy would see a valid cookie and redirect them to `/`, and the browser would
ping-pong between the two until it gave up — for the one user population where
getting it wrong matters most.

Two answers to "is this person signed in?" cannot both drive redirects. So there
is now exactly one: the pages, which can read the profile. The proxy keeps only
its fail-closed check that *some* session exists, and role routing lives in the
layouts and `/`, where `profiles.role` — the authority — is readable directly.
This costs one server render on a mismatched URL and removes an entire class of
bug, along with the JWT-claim staleness the spec was apologising for.

`src/app/page.tsx` keeps its preview switchboard under `isUiPreview()`, and
otherwise redirects: admin → `/admin`, staff → `/staff`, superadmin → `/admin`,
nobody → `/login`.

### 5.8 What is deliberately NOT in this phase

- `students`, `university_applications`, `student_staff_assignments` tables and
  their RLS policies. Screens keep reading `src/lib/mock/`.
- The `student_staff_assignments` many-to-many refactor. Resolved as a
  decision; it belongs with the data migration, not with auth.
- The superadmin route itself (see §9).
- Custom SMTP, storage buckets, backups.

This leaves one honest seam: after this lands, the **identity** is real and the
**student rows** are still fixtures. Signing in as staff shows the mock
caseload, not a scoped query. That is the intended intermediate state, and the
layouts will say so in a comment.

## 6. New guardrails

`scripts/check-guardrails.mjs` gains two rules, so these survive without anyone
remembering them at review time:

1. **`secret-key`** — `SUPABASE_SECRET_KEY` is treated exactly like
   `SUPABASE_SERVICE_ROLE_KEY`: nameable only in `src/lib/supabase/admin.ts`,
   and never as a `NEXT_PUBLIC_*` variable.
2. **`role-from-user-metadata`** — flags any file that reads a role out of
   `user_metadata` / `raw_user_meta_data`. That is the exact privilege
   escalation in principle 2, and it looks completely reasonable in a diff.

## 7. Verification

```bash
npm run guardrails   # includes the two new rules
npm run verify       # guardrails + typecheck + lint
npm run build
```

Manual, against the real project:

1. Preview mode (`NEXT_PUBLIC_UI_PREVIEW=true`) still renders every screen with
   no login. **Regression check — this must not break.**
2. Preview off, signed out: every route redirects to `/login`; `/login`,
   `/forgot-password`, `/reset-password` do not.
3. Wrong password and unknown address produce the *same* message.
4. Sign in as the bootstrapped admin → lands on `/admin`.
5. Invite a staff address → email arrives → link sets a password → lands on
   `/staff`.
6. That staff account requesting `/admin` is redirected to `/staff`.
7. From the browser console, signed in as staff:
   ```js
   await supabase.auth.updateUser({ data: { role: 'admin' } })   // may succeed
   await supabase.from('profiles').select('role').single()       // still 'staff'
   await supabase.from('profiles').update({ role: 'admin' })     // denied
   ```
   The first call is *expected* to succeed — that is precisely why the role
   does not live there.
8. Sign out ends the session; the back button does not restore it.

## 8. Owner's dashboard checklist

Code cannot do these. Nothing below involves pasting a secret into a chat.

- [ ] **Authentication → Sign In / Providers → disable "Allow new users to sign
      up".** Supabase ships this **on**, which directly contradicts PRD §7.
      Until it is off, anyone with the publishable key — which is in the browser
      bundle by design — can create themselves an account.
- [ ] Email provider enabled; "Confirm email" on.
- [ ] **URL Configuration:** Site URL = the production URL,
      `https://ituniconsultancy.com` (Vercel serves it; the domain is
      registered at Hostinger). Redirect allowlist must include
      `http://localhost:3000/**` and `https://ituniconsultancy.com/**`, or
      invite and reset links bounce. Keep the `*.vercel.app` preview pattern
      allowlisted too if previews are used to test auth.
- [ ] *Optional but recommended* — **Email Templates → Invite user**, replace
      `{{ .ConfirmationURL }}` with
      `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=invite&next=/reset-password`.
      This moves invite acceptance entirely server-side and retires the
      client-side fragment path in §5.4. Everything works without it; this is
      the tidier configuration, not a fix for anything broken.
- [ ] Copy the `sb_secret_…` key from Settings → API Keys into `.env.local` and
      into Vercel's environment variables. Never into the repo, never into a
      Builder.io environment, never into a chat.
- [ ] **Custom SMTP.** The default mailer is capped near 2 emails/hour
      (`CLAUDE.md`). Invites and resets are unreliable until this is set.
      Use the Hostinger Premium Business Email account on the domain:
      host `smtp.hostinger.com`, port 465 (SSL) or 587 (STARTTLS), username =
      the full mailbox address. Enter the password in the Supabase dashboard
      only — never in the repo, never in a chat.
- [ ] Note the free-tier pause: the project sleeps after 7 days idle.

## 9. Open questions

### Resolved before implementation

1. **Bootstrap.** The owner's address → `admin`; the developer's
   (`sayedrafe117@gmail.com`) → `superadmin`, kept separate. Both go into
   `supabase/seed/bootstrap-admin.sql`, which ships with the addresses blank —
   they are filled in and run once, by hand.
2. **Inactive staff are blocked immediately.** Enforced in two places:
   `getSessionUser()` refuses the account on its next request, and
   `setStaffStatusAction` bans it at the Auth layer so an already-issued token
   cannot be refreshed.
3. **Local default stays `NEXT_PUBLIC_UI_PREVIEW=true`**, so UI work and
   Builder.io Fusion keep their no-credentials path.

### Still open — not guessed at

1. **What path is the superadmin route?** PRD §4.3 says unlisted but disclosed.
   The role exists in the schema and has full access; the route is not built.
   Until it is, `superadmin` lands on `/admin`.
2. **May staff see the names of co-assigned staff on a shared student?** Strict
   scoping is settled for students; this is about `profiles`. The current
   policy is the strict reading: a staff account can select its own row and no
   other. If the answer is yes, it is one added clause on
   `profiles_select_self_or_admin`.
3. **What appears on the Admin's departure alert?** The resolved rule says a
   departing staff member raises a flag and the Admin reassigns manually. The
   `status` column and the deactivation path exist; which students count as
   orphaned, and how loudly to say so, is product vocabulary that is not
   settled.
