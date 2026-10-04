-- Owner request, 2026-10-04.
-- 1. A university application also records the preferred subject, the
--    entrance exam and the date it is booked on, the scholarship's name and
--    application link, and "enrollment fee paid" as its own tick box, separate
--    from "admission confirmed".
-- 2. The owner confirmed the status wording (PRD §10's open question):
--      Application: Complete · Waiting For University Approval · Confirm
--                   (all three count as submitted in reports)
--      Scholarship: Complete · Waiting For Approval · Confirm
--                   (Confirm counts as awarded)
--    They are ordinary workflow_statuses rows, so Settings can still rename,
--    archive or add labels. University decision: Pending / Approved /
--    Rejected ('accepted' is shown as Approved); the column is unchanged.
-- 3. An admin or the assigned staff can CLOSE a student file, giving a reason.
--    A closed file stays visible to the same people, marked closed, and is
--    read-only for everyone. Only an admin can reopen it. The reason and each
--    close/reopen are also written to the file's notes, so the history stays.
begin;

alter table public.university_applications
  add column preferred_subject text not null default '' check (length(preferred_subject) <= 200),
  add column entrance_exam text not null default '' check (length(entrance_exam) <= 200),
  add column entrance_exam_date date,
  add column scholarship_name text not null default '' check (length(scholarship_name) <= 240),
  add column scholarship_link text check (scholarship_link ~ '^https?://' and length(scholarship_link) <= 2048),
  add column enrollment_fee_paid boolean not null default false;
grant insert (preferred_subject, entrance_exam, entrance_exam_date, scholarship_name, scholarship_link, enrollment_fee_paid)
  on public.university_applications to authenticated;
grant update (preferred_subject, entrance_exam, entrance_exam_date, scholarship_name, scholarship_link, enrollment_fee_paid)
  on public.university_applications to authenticated;

-- Skips any label that already exists (case-insensitive), so this is safe on a
-- project where an admin already typed some of them in Settings.
insert into public.workflow_statuses(category, label, counts_as_submitted, counts_as_awarded)
select v.category, v.label, v.submitted, v.awarded from (values
  ('application', 'Complete', true, false),
  ('application', 'Waiting For University Approval', true, false),
  ('application', 'Confirm', true, false),
  ('scholarship', 'Complete', false, false),
  ('scholarship', 'Waiting For Approval', false, false),
  ('scholarship', 'Confirm', false, true)
) as v(category, label, submitted, awarded)
where not exists (select 1 from public.workflow_statuses s
  where s.category = v.category and lower(btrim(s.label)) = lower(v.label));

alter table public.students
  add column closed_at timestamptz,
  add column closed_by uuid references public.profiles(id),
  add column close_reason text check (length(btrim(close_reason)) between 3 and 2000),
  add check ((closed_at is null) = (closed_by is null) and (closed_at is null) = (close_reason is null));
-- No column grant: only the two functions below change these columns.

-- A closed file is read-only, exactly like an archived one: no edits to the
-- file, its applications, notes or documents, for admins too.
create or replace function public.can_write_student(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.can_access_student(target)
    and exists (select 1 from public.students where id = target and archived_at is null and closed_at is null);
$$;

create function public.close_student_file(p_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare reason text := btrim(coalesce(p_reason, ''));
begin
  if length(reason) not between 3 and 2000 then raise exception 'Write the reason this file is being closed.'; end if;
  perform 1 from public.students where id = p_id for update;
  if not public.can_write_student(p_id) then
    raise exception 'This file is unavailable, archived or already closed. Reload the page.';
  end if;
  update public.students set closed_at = now(), closed_by = auth.uid(), close_reason = reason where id = p_id;
  insert into public.student_notes(student_id, author_id, body) values (p_id, auth.uid(), 'File closed. Reason: ' || reason);
end;
$$;

create function public.reopen_student_file(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Only an admin can reopen a closed file.' using errcode = '42501'; end if;
  update public.students set closed_at = null, closed_by = null, close_reason = null
    where id = p_id and closed_at is not null and archived_at is null;
  if not found then raise exception 'This file is not closed, or it is archived. Reload the page.'; end if;
  insert into public.student_notes(student_id, author_id, body) values (p_id, auth.uid(), 'File reopened.');
end;
$$;

revoke all on function public.close_student_file(uuid, text), public.reopen_student_file(uuid) from public, anon;
grant execute on function public.close_student_file(uuid, text), public.reopen_student_file(uuid) to authenticated;
commit;
