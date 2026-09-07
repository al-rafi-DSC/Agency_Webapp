-- ============================================================================
-- bootstrap-admin.sql — RUN ONCE, BY HAND. Not a migration.
--
-- WHY THIS IS NOT A MIGRATION: it hard-codes who specific people are. A
-- migration re-runs on every environment (local, staging, a future restore),
-- and "grant this email address admin" is not something that should replay
-- itself anywhere a copy of the schema is applied.
--
-- WHY IT IS NEEDED: public.handle_new_user() defaults every account to
-- 'staff', which is correct — a mistake should fail toward less privilege, not
-- more. But that leaves nobody able to send the first invite. Exactly one
-- account has to be promoted out of band, and this is it.
--
-- HOW TO RUN:
--   1. Both people below sign in once (or accept an invite), so their
--      auth.users row — and therefore their profile — exists.
--   2. Supabase dashboard → SQL Editor → paste this file with the two
--      addresses filled in → Run.
--   3. Verify with the SELECT at the bottom before closing the editor.
-- ============================================================================

-- The agency owner. Full visibility into every student and staff member
-- (PRD §4.1).
update public.profiles
   set role = 'admin'
 where lower(email) = lower('REPLACE_WITH_OWNER_EMAIL');

-- The developer. Full access for support and maintenance, disclosed to the
-- owner, and deliberately absent from the Admin and Staff navigation
-- (PRD §4.3). This is the "hidden but not secret" role — it should be
-- visible in code review and in this file, just not in the product UI.
update public.profiles
   set role = 'superadmin'
 where lower(email) = lower('REPLACE_WITH_DEVELOPER_EMAIL');

-- Check the result. Two rows, and neither role should read 'staff'.
-- If a row is missing, that person has not signed in yet — no auth.users row
-- means no profile to promote.
select email, role, status, created_at
  from public.profiles
 where role in ('admin', 'superadmin')
 order by role, email;
