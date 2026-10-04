-- Owner request, 2026-10-05: a note on a student file carries a priority —
-- Urgent, Moderate or Normal (the default). An Urgent or Moderate note can be
-- marked resolved by anyone who may write the file (admin or assigned staff);
-- it keeps its text and records who resolved it and when. Nothing is deleted.
-- Unresolved Urgent notes are surfaced on the dashboards and student lists.
begin;

alter table public.student_notes
  add column priority text not null default 'normal' check (priority in ('urgent', 'moderate', 'normal')),
  add column resolved_at timestamptz,
  add column resolved_by uuid references public.profiles(id),
  add check ((resolved_at is null) = (resolved_by is null)),
  add check (priority <> 'normal' or resolved_at is null);
create index open_priority_notes on public.student_notes(student_id)
  where priority <> 'normal' and resolved_at is null and archived_at is null;

-- Priority is chosen when the note is written. resolved_* has no grant: only
-- resolve_student_note() below sets it.
grant insert (priority) on public.student_notes to authenticated;

create function public.resolve_student_note(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare note public.student_notes;
begin
  select * into note from public.student_notes where id = p_id for update;
  -- can_write_student: assigned (or admin), file not archived and not closed.
  if not found or not public.can_write_student(note.student_id) then
    raise exception 'This note is unavailable, or the file is closed or archived. Reload the page.';
  end if;
  if note.archived_at is not null then raise exception 'This note is archived.'; end if;
  if note.priority = 'normal' then raise exception 'Only an Urgent or Moderate note can be resolved.'; end if;
  if note.resolved_at is not null then raise exception 'This note was already resolved. Reload the page.'; end if;
  update public.student_notes set resolved_at = now(), resolved_by = auth.uid() where id = p_id;
end;
$$;

revoke all on function public.resolve_student_note(uuid) from public, anon;
grant execute on function public.resolve_student_note(uuid) to authenticated;
commit;
