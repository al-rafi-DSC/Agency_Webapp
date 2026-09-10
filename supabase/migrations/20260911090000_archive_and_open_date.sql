-- Owner decisions, 2026-09-11.
-- 1. An admin can archive and restore a student file, an application, a note or
--    a document. Nothing is deleted: archived rows stay for history and restore.
--    Staff lose sight of them, nobody can edit them, and new report drafts leave
--    them out. Approved report snapshots never change.
-- 2. Only an admin can change a student's file-opened date, because that date
--    decides which reporting year the student counts as new.
begin;

alter table public.students add column archived_at timestamptz, add column archived_by uuid references public.profiles(id),
  add check ((archived_at is null) = (archived_by is null));
alter table public.university_applications add column archived_at timestamptz, add column archived_by uuid references public.profiles(id),
  add check ((archived_at is null) = (archived_by is null));
alter table public.student_notes add column archived_at timestamptz, add column archived_by uuid references public.profiles(id),
  add check ((archived_at is null) = (archived_by is null));
alter table public.student_documents add column archived_at timestamptz, add column archived_by uuid references public.profiles(id),
  add check ((archived_at is null) = (archived_by is null));
-- The existing column grants do not include the new columns, so only
-- set_archived() below can change them.

-- Staff lose access to an archived file entirely. Admins keep reading it.
create or replace function public.can_access_student(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.current_user_role() is not null and (
    public.is_admin() or exists (
      select 1 from public.student_staff_assignments a join public.students s on s.id = a.student_id
      where a.student_id = target and a.worker_id = auth.uid() and a.ended_at is null and s.archived_at is null
    )
  );
$$;

-- Writes additionally need an open (not archived) file, for admins too.
-- Built on can_access_student, so it reveals nothing about inaccessible files.
create function public.can_write_student(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.can_access_student(target)
    and exists (select 1 from public.students where id = target and archived_at is null);
$$;

-- History rows follow their application: hidden from staff once archived.
create function public.can_read_application(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.university_applications a where a.id = target
    and public.can_access_student(a.student_id) and (a.archived_at is null or public.is_admin()));
$$;

-- Now SECURITY DEFINER: it must see archived document rows that RLS hides
-- from staff, so a staff member cannot download an archived document's file.
create or replace function public.can_access_student_object(object_name text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare student_id uuid;
begin
  begin
    student_id := split_part(object_name, '/', 1)::uuid;
  exception when invalid_text_representation then return false;
  end;
  return public.can_access_student(student_id) and (public.is_admin() or not exists (
    select 1 from public.student_documents d where d.storage_path = object_name and d.archived_at is not null));
end;
$$;

alter policy students_edit on public.students
  using (public.can_write_student(id)) with check (public.can_write_student(id));
alter policy applications_read on public.university_applications
  using (public.can_access_student(student_id) and (archived_at is null or public.is_admin()));
alter policy applications_add on public.university_applications
  with check (public.can_write_student(student_id));
alter policy applications_edit on public.university_applications
  using (public.can_write_student(student_id) and archived_at is null)
  with check (public.can_write_student(student_id) and archived_at is null);
alter policy history_read on public.application_history
  using (public.can_read_application(application_id));
alter policy notes_read on public.student_notes
  using (public.can_access_student(student_id) and (archived_at is null or public.is_admin()));
alter policy notes_add on public.student_notes
  with check (public.can_write_student(student_id) and author_id = (select auth.uid()));
alter policy documents_read on public.student_documents
  using (public.can_access_student(student_id) and (archived_at is null or public.is_admin()));
alter policy documents_add on public.student_documents
  with check (public.can_write_student(student_id) and uploaded_by = (select auth.uid()));

-- Archiving is not an application change: no history row, no report event.
create or replace function workspace_private.record_application() returns trigger
language plpgsql security definer set search_path = '' as $$
declare ignored text[] := array['updated_at', 'archived_at', 'archived_by'];
begin
  if tg_op = 'UPDATE' and (to_jsonb(old) - ignored) = (to_jsonb(new) - ignored) then return new; end if;
  insert into public.application_history(application_id, student_id, actor_id, before_data, after_data)
  values (new.id, new.student_id, auth.uid(), case when tg_op = 'UPDATE' then to_jsonb(old) else null end, to_jsonb(new));
  return new;
end;
$$;

create function workspace_private.guard_file_opened_at() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.file_opened_at is distinct from old.file_opened_at and not public.is_admin() then
    raise exception 'Only an admin can change the file-opened date.';
  end if;
  return new;
end;
$$;
create trigger guard_file_opened_at before update of file_opened_at on public.students
  for each row execute function workspace_private.guard_file_opened_at();

create function public.set_archived(p_kind text, p_id uuid, p_archived boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare stamp timestamptz := case when p_archived then now() end;
  actor uuid := case when p_archived then auth.uid() end;
begin
  if not public.is_admin() then raise exception 'Only an admin can archive or restore records.' using errcode = '42501'; end if;
  if p_archived is null then raise exception 'Choose archive or restore.'; end if;
  if p_kind = 'student' then
    update public.students set archived_at = stamp, archived_by = actor where id = p_id and (archived_at is null) = p_archived;
  elsif p_kind = 'application' then
    update public.university_applications set archived_at = stamp, archived_by = actor where id = p_id and (archived_at is null) = p_archived;
  elsif p_kind = 'note' then
    update public.student_notes set archived_at = stamp, archived_by = actor where id = p_id and (archived_at is null) = p_archived;
  elsif p_kind = 'document' then
    update public.student_documents set archived_at = stamp, archived_by = actor where id = p_id and (archived_at is null) = p_archived;
  else
    raise exception 'Unknown record type.';
  end if;
  if not found then raise exception 'This record was not found or was already changed. Reload the page.'; end if;
end;
$$;

-- Same definitions as before, leaving out archived files and applications.
create or replace function workspace_private.report_payload(p_start date, p_end date) returns jsonb
language sql stable security definer set search_path = '' as $$
  with events as (
    select h.*,
      (h.after_data->>'is_submitted')::boolean and not coalesce((h.before_data->>'is_submitted')::boolean, false) as submitted,
      h.after_data->>'decision_status' = 'accepted' and coalesce(h.before_data->>'decision_status', '') <> 'accepted' as accepted,
      h.after_data->>'decision_status' = 'rejected' and coalesce(h.before_data->>'decision_status', '') <> 'rejected' as rejected,
      (h.after_data->>'admission_confirmed')::boolean and not coalesce((h.before_data->>'admission_confirmed')::boolean, false) as confirmed,
      (h.after_data->>'is_awarded')::boolean and not coalesce((h.before_data->>'is_awarded')::boolean, false) as awarded
    from public.application_history h
    join public.university_applications a on a.id = h.application_id and a.archived_at is null
    join public.students s on s.id = h.student_id and s.archived_at is null
    where h.occurred_at >= p_start::timestamp at time zone 'UTC'
      and h.occurred_at < (p_end + 1)::timestamp at time zone 'UTC'
  ), handled as (
    select a.student_id, a.worker_id from public.student_staff_assignments a
    join public.students s on s.id = a.student_id and s.archived_at is null
    where a.assigned_at < (p_end + 1)::timestamp at time zone 'UTC'
      and (a.ended_at is null or a.ended_at > p_start::timestamp at time zone 'UTC')
  ), totals as (
    select count(distinct application_id) filter (where submitted) as applications_submitted,
      count(distinct application_id) filter (where accepted) as offers_received,
      count(distinct application_id) filter (where rejected) as rejections_received,
      count(distinct application_id) filter (where confirmed) as admissions_confirmed,
      count(distinct application_id) filter (where awarded) as scholarships_awarded from events
  ), workers as (
    select p.id, p.full_name,
      (select count(distinct h.student_id) from handled h where h.worker_id = p.id) as students_handled,
      (select count(distinct e.application_id) from events e where e.actor_id = p.id) as applications_updated
    from public.profiles p where p.role = 'staff'
  ), universities as (
    select after_data->>'university_name' as university_name,
      count(distinct application_id) filter (where submitted) as applications_submitted,
      count(distinct application_id) filter (where accepted) as offers_received,
      count(distinct application_id) filter (where rejected) as rejections_received from events
    group by after_data->>'university_name'
  )
  select jsonb_build_object(
    'new_students', (select count(*) from public.students where file_opened_at between p_start and p_end and archived_at is null),
    'students_handled', (select count(distinct student_id) from handled),
    'applications_submitted', t.applications_submitted, 'offers_received', t.offers_received,
    'rejections_received', t.rejections_received, 'admissions_confirmed', t.admissions_confirmed,
    'scholarships_awarded', t.scholarships_awarded,
    'workers', coalesce((select jsonb_agg(to_jsonb(w) order by w.full_name) from workers w), '[]'::jsonb),
    'universities', coalesce((select jsonb_agg(to_jsonb(u) order by u.university_name) from universities u), '[]'::jsonb)
  ) from totals t;
$$;

revoke all on all functions in schema workspace_private from public, anon, authenticated;
revoke all on function public.can_write_student(uuid), public.can_read_application(uuid),
  public.set_archived(text, uuid, boolean) from public, anon;
grant execute on function public.can_write_student(uuid), public.can_read_application(uuid),
  public.set_archived(text, uuid, boolean) to authenticated;
commit;
