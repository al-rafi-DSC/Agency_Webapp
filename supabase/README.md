# `supabase/` — schema, policies, and how to apply them

Hand-written only. Generated UI must not create, edit, or delete anything in
this directory (`AGENTS.md` § File ownership). Row Level Security policies are
the access-control boundary for the whole product; they do not get drafted by
an AI canvas.

Design rationale for everything in here: **`../supabaseauth.md`**.

```
migrations/20260907120000_auth_identity.sql   identity layer — profiles, roles, RLS
seed/bootstrap-admin.sql                      run once, by hand, to create the first Admin
```

## Applying the migration

Two ways. The dashboard route needs no CLI and no login, and is the right
choice for a one-off.

### Dashboard (simplest)

1. Supabase → **SQL Editor** → New query.
2. Paste the whole of `migrations/20260907120000_auth_identity.sql`.
3. Run. It is idempotent — re-running is safe.

### CLI

```bash
npx supabase link --project-ref hqyavenqhutmbiiusrhz
npx supabase db push
```

`link` prompts for the database password (the one set when the project was
created — not any API key). If that password has been lost, reset it under
Settings → Database; it is unrelated to the publishable and secret keys.

## Then, once

Fill the two addresses into `seed/bootstrap-admin.sql` and run it in the SQL
Editor. Until that runs, every account is `staff` and nobody can invite anyone
— which is the intended failure direction, but it does mean the app looks
broken if you skip this step.

## Dashboard settings the schema cannot set

- **Authentication → Sign In / Providers → turn OFF "Allow new users to sign
  up".** Supabase ships this **on**. It directly contradicts PRD §7, and while
  it is on, anyone holding the publishable key — which is in the browser
  bundle by design, and is not a secret — can create themselves an account.
  RLS would keep that account from reading anyone's students, but it should
  not exist at all.
- **Authentication → URL Configuration.** Site URL = the production Vercel URL.
  Redirect allowlist must include `http://localhost:3000/**` and
  `https://<production-domain>/**`, or every invite and reset link bounces.
- **Custom SMTP.** The built-in mailer is capped near 2 emails/hour. Invites
  and password resets are not reliable until this is configured.

## Adding a table later

Two rules, both from `AGENTS.md` and PRD §7:

1. **The RLS policy ships in the same migration as the table.** Not after. A
   table holding student data that exists for even one deploy without a policy
   is readable by every authenticated account.
2. **Reuse `public.is_admin()`.** It is the single definition of the admin
   test. Do not re-derive it inline — a policy copy-pasted fifteen times is
   fifteen chances to get it subtly wrong, and an RLS mistake fails silently
   by returning rows rather than loudly by raising.

Staff scoping, when the student tables land, tests membership in
`student_staff_assignments` (many-to-many — one student may be assigned to
several staff). Staff see only their assigned students: nothing about
unassigned students, not even names.

Statuses to leave alone for now: `application_status` and `scholarship_status`
are open questions (PRD §10). Do not write an enum or CHECK constraint against
the placeholder unions in `src/types/db.ts`.
