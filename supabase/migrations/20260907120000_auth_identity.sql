-- ============================================================================
-- 20260907120000_auth_identity.sql
--
-- Identity and roles for Agency Workspace. See `supabaseauth.md` for the
-- reasoning behind every choice below.
--
-- SCOPE: this migration creates ONLY the identity layer — `profiles`, the role
-- enum, and the RLS scaffolding that later policies will build on. It does NOT
-- create `students`, `university_applications` or `student_staff_assignments`.
-- `application_status` and `scholarship_status` are still open questions
-- (PRD §10) and AGENTS.md forbids writing an enum or CHECK constraint against
-- the placeholder unions in src/types/db.ts. Nothing here depends on them.
--
-- Idempotent: safe to re-run.
-- ============================================================================

-- ── Enums ───────────────────────────────────────────────────────────────────
-- user_role mirrors USER_ROLES in src/types/db.ts and is confirmed by PRD §4.
-- These are NOT the placeholder status enums.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('admin', 'staff', 'superadmin');
  end if;
end
$$;

-- Staff departure must be representable. The resolved assignment rules say a
-- departing staff member raises an Admin alert and triggers MANUAL
-- reassignment — which needs a state for "no longer works here" that is not
-- "row deleted", because the student assignments must survive long enough to
-- be reassigned.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'account_status') then
    create type public.account_status as enum ('active', 'inactive');
  end if;
end
$$;

-- ── profiles ────────────────────────────────────────────────────────────────
-- One row per account, keyed directly on auth.users.id. No separate
-- auth_user_id join column: a second key buys nothing and gives two ways to
-- write the same relationship.
--
-- ⚠ THIS TABLE IS WHERE THE ROLE LIVES, and that is a security decision, not a
-- schema convenience. A signed-in user can rewrite their own
-- auth.users.raw_user_meta_data through supabase.auth.updateUser() with
-- nothing but the browser-side publishable key. A role stored there would be a
-- self-service promotion to admin for every staff account.
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null default '',
  full_name  text not null default '',
  role       public.user_role      not null default 'staff',
  status     public.account_status not null default 'active',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Application identity, one row per auth.users account. The role column is the '
  'sole authority on what an account may do; never read a role from user_metadata.';
comment on column public.profiles.role is
  'Authoritative. authenticated has NO update privilege on this column — see the '
  'column-level grants below.';
comment on column public.profiles.status is
  'inactive = departed. Blocks sign-in (enforced in src/lib/auth/session.ts and '
  'by an auth-level ban), and drives the orphaned-student alert queue.';

create index if not exists profiles_role_idx   on public.profiles (role);
create index if not exists profiles_status_idx on public.profiles (status);
create index if not exists profiles_email_idx  on public.profiles (lower(email));

-- ── Privileges ──────────────────────────────────────────────────────────────
-- These run BEFORE the policies, and they are the load-bearing half of the
-- protection.
--
-- Supabase's default privileges grant ALL on new public tables to anon and
-- authenticated, so the revoke is not optional.
--
-- A POLICY governs WHICH ROWS a statement may touch. Only a COLUMN GRANT
-- governs WHICH COLUMNS. Without the column list below, the "update your own
-- row" policy further down cheerfully permits `set role = 'admin'` on your own
-- row — which is exactly the escalation this whole design exists to prevent.
revoke all on public.profiles from anon, authenticated;
grant  select                         on public.profiles to authenticated;
grant  update (full_name, avatar_url) on public.profiles to authenticated;

-- ── Row Level Security ──────────────────────────────────────────────────────
-- ENABLE, deliberately not FORCE.
--
-- FORCE would remove the table-owner exemption, and the security definer
-- helpers below rely on that exemption to read `profiles` without re-entering
-- the policy that called them (infinite recursion). Owner exemption is a
-- property of table ownership; BYPASSRLS is a role attribute that a managed
-- platform may or may not grant. Depending on ownership is deterministic.
--
-- FORCE protects against a compromised owner connection, which in this project
-- is the same credential that could simply drop the policies.
alter table public.profiles enable row level security;

-- ── Role resolution helpers ─────────────────────────────────────────────────
-- security definer so a policy ON profiles can read FROM profiles without
-- recursing through itself.
--
-- NOT named current_role(): CURRENT_ROLE is a reserved word in Postgres.
create or replace function public.current_user_role()
  returns public.user_role
  language sql
  stable
  security definer
  set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- The SINGLE definition of "is this caller an admin".
--
-- Every future policy on students, university_applications and
-- student_staff_assignments must call this rather than re-deriving the test.
-- One definition means one place to audit and one place to change; a test
-- copy-pasted into fifteen policies is fifteen chances to get it subtly wrong,
-- and RLS mistakes fail silently by returning rows.
create or replace function public.is_admin()
  returns boolean
  language sql
  stable
  security definer
  set search_path = public
as $$
  select coalesce(public.current_user_role() in ('admin', 'superadmin'), false);
$$;

-- Deliberately reads the TABLE, not auth.jwt(). A JWT claim would be one less
-- lookup, but access tokens live for about an hour: a demoted account would
-- keep admin reads until its token refreshed. This is a single indexed lookup
-- on a table with one row per employee.
comment on function public.is_admin() is
  'Authoritative admin test for RLS policies. Reads profiles.role, not the JWT, '
  'so a role change takes effect on the next query rather than the next token refresh.';

revoke execute on function public.current_user_role() from public, anon;
revoke execute on function public.is_admin()          from public, anon;
grant  execute on function public.current_user_role() to authenticated;
grant  execute on function public.is_admin()          to authenticated;

-- ── Policies ────────────────────────────────────────────────────────────────
-- No INSERT policy: rows are created only by the auth.users trigger below.
-- No DELETE policy: removal cascades from auth.users.
-- Both omissions are intentional — with RLS enabled, absent policy means denied.
drop policy if exists profiles_select_self_or_admin on public.profiles;
create policy profiles_select_self_or_admin
  on public.profiles
  for select
  to authenticated
  using (id = (select auth.uid()) or public.is_admin());

-- Paired with the column grants above: the policy picks the row, the grant
-- picks the columns. Either alone is insufficient.
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self
  on public.profiles
  for update
  to authenticated
  using      (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ── Triggers ────────────────────────────────────────────────────────────────

-- Creates the profile whenever an account is created (invite, or any other
-- path).
--
-- ⚠ The role is read from raw_app_meta_data, which ONLY a secret-key call can
-- write. It is never read from raw_user_meta_data, which the account holder
-- can rewrite from the browser. Anything unrecognised or absent falls back to
-- 'staff' — the least-privileged role, so a mistake fails safe.
create or replace function public.handle_new_user()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  granted_role public.user_role;
begin
  begin
    granted_role := coalesce(
      (new.raw_app_meta_data ->> 'role')::public.user_role,
      'staff'::public.user_role
    );
  exception when invalid_text_representation then
    granted_role := 'staff'::public.user_role;
  end;

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), ''),
    granted_role
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keeps profiles.email in step after a verified email change.
create or replace function public.handle_user_email_change()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  update public.profiles
     set email = coalesce(new.email, '')
   where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (new.email is distinct from old.email)
  execute function public.handle_user_email_change();

-- Blocks a role or status change from any caller that is not privileged.
--
-- Strictly redundant against the column grants above — and included for
-- exactly that reason. If a future migration re-grants profiles broadly (a
-- one-line `grant all on public.profiles to authenticated` is an easy thing to
-- write while debugging something unrelated), the escalation then fails loudly
-- here instead of silently succeeding.
--
-- security INVOKER on purpose: this needs to see the CALLER's role.
-- security definer would report the function owner and defeat the check.
create or replace function public.profiles_guard_privileged_columns()
  returns trigger
  language plpgsql
as $$
begin
  if new.role is distinct from old.role
     or new.status is distinct from old.status then
    if current_user not in
       ('service_role', 'postgres', 'supabase_admin', 'supabase_auth_admin') then
      raise exception
        'profiles.role and profiles.status may only be changed by a privileged server-side call'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_privileged_columns on public.profiles;
create trigger profiles_guard_privileged_columns
  before update on public.profiles
  for each row execute function public.profiles_guard_privileged_columns();

create or replace function public.set_updated_at()
  returns trigger
  language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ── Backfill ────────────────────────────────────────────────────────────────
-- Any account created before this migration ran has no profile. Without a
-- profile, getSessionUser() returns null and the account cannot sign in —
-- which is correct behaviour, but confusing if it is the owner's own test
-- account. Everyone lands on 'staff'; promote via supabase/seed/bootstrap-admin.sql.
insert into public.profiles (id, email, full_name)
select u.id,
       coalesce(u.email, ''),
       coalesce(nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''), '')
  from auth.users u
 where not exists (select 1 from public.profiles p where p.id = u.id);
