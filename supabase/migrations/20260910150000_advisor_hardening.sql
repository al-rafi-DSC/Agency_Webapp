-- Follow-up to the Supabase security and performance advisors, run after the
-- first three migrations were applied to the hosted project. No access change:
-- every policy admits exactly the same rows as before.
begin;

-- Trigger functions are not API endpoints. Supabase grants EXECUTE on new
-- public functions to everyone, which exposes them at /rest/v1/rpc/*. Postgres
-- checks EXECUTE only when a trigger is created, not when it fires, so the
-- triggers keep working.
revoke execute on function public.handle_new_user(), public.handle_user_email_change(),
  public.profiles_guard_privileged_columns(), public.set_updated_at()
  from public, anon, authenticated;

-- Pin search_path on the two SECURITY INVOKER trigger functions. Both use only
-- pg_catalog names (now(), current_user), which stay resolvable.
alter function public.set_updated_at() set search_path = '';
alter function public.profiles_guard_privileged_columns() set search_path = '';

-- (select auth.uid()) is evaluated once per statement instead of once per row.
alter policy workers_read on public.worker_details
  using (public.current_user_role() is not null and (profile_id = (select auth.uid()) or public.is_admin()));
alter policy assignments_read on public.student_staff_assignments
  using (public.current_user_role() is not null and (public.is_admin() or worker_id = (select auth.uid())));
alter policy notes_add on public.student_notes
  with check (public.can_access_student(student_id) and author_id = (select auth.uid()));
alter policy documents_add on public.student_documents
  with check (public.can_access_student(student_id) and uploaded_by = (select auth.uid()));
commit;
