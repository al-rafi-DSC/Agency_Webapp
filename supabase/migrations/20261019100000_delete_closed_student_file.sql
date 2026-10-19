-- Permanently delete a closed student file (requested 2026-10-19).
--
-- This is the one exception to "records are never deleted" (2026-09-11):
-- archiving still hides and restores, and is still the default. Deleting
-- erases the file for good, with everything attached to it:
--   * its university applications and their history,
--   * its notes, document records and worker assignments,
--   * the Google Form submission it was opened from, if any.
-- Nothing can be restored afterwards.
--
-- Guard rails, all enforced here rather than in the app:
--   * Admin only (is_admin(), which reads profiles.role, never metadata);
--   * the file must already be closed, so an open file can never be erased
--     in one step;
--   * the caller must send the student's full name, typed by hand, which
--     must match the file — a wrong id from a stale page cannot delete a
--     different student.
-- authenticated has no DELETE privilege on any of these tables; this
-- function is the only way to delete.
--
-- Additive. Apply before deploying the app code that calls it.
begin;

create function public.delete_closed_student_file(p_id uuid, p_confirm_name text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  target_name text;
  target_closed timestamptz;
begin
  if not public.is_admin() then raise exception 'Only an admin can delete a student file.' using errcode = '42501'; end if;
  select full_name, closed_at into target_name, target_closed from public.students where id = p_id for update;
  if not found or target_closed is null then
    raise exception 'Only a closed file can be deleted. Reload the page.';
  end if;
  if lower(btrim(coalesce(p_confirm_name, ''))) <> lower(btrim(target_name)) then
    raise exception 'The name you typed does not match this file. Type the student''s full name to confirm.';
  end if;

  delete from public.application_history where student_id = p_id;
  delete from public.university_applications where student_id = p_id;
  delete from public.student_notes where student_id = p_id;
  delete from public.student_documents where student_id = p_id;
  delete from public.student_staff_assignments where student_id = p_id;
  delete from public.student_submissions where student_id = p_id;
  delete from public.students where id = p_id;
end;
$$;

revoke all on function public.delete_closed_student_file(uuid, text) from public, anon;
grant execute on function public.delete_closed_student_file(uuid, text) to authenticated;
commit;
