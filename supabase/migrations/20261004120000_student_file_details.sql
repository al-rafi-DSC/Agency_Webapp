-- Owner request, 2026-10-04: the "Open a student file" form asks for
--   name and surname (separately), the file-opened date, phone, Gmail,
--   where the applicant belongs (EU equivalent or international),
--   a Google Drive link, and one assigned worker.
-- Every newly opened file shows as a notification on each admin's dashboard
-- until that admin marks it as seen.
--
-- 1. first_name + surname become the editable name. full_name stays as the
--    column every list, search and report already reads, but a trigger now
--    derives it, so it can no longer be written directly.
-- 2. applicant_type: 'eu_equivalent' | 'international'. Existing files are
--    left unset (null) until someone chooses.
-- 3. drive_link: HTTPS only. Staff assigned to the file can read it; only an
--    admin can set or change it (trigger, like the file-opened date).
-- 4. The removed student Google Form's functions are dropped: they called the
--    old create_student() signature, and submit_student_form() was still
--    callable without a session. The student_submissions table and its rows
--    are kept — records are never deleted.
begin;

alter table public.students
  add column first_name text not null default '' check (length(first_name) <= 200),
  add column surname text not null default '' check (length(surname) <= 200),
  add column applicant_type text check (applicant_type in ('eu_equivalent', 'international')),
  add column drive_link text check (drive_link ~ '^https://[^\s]+$' and length(drive_link) <= 2048);

-- Split existing names at the first space: "Ahmed Rahman Khan" → "Ahmed" + "Rahman Khan".
update public.students set
  first_name = split_part(btrim(full_name), ' ', 1),
  surname = btrim(substr(btrim(full_name), length(split_part(btrim(full_name), ' ', 1)) + 1));
alter table public.students add check (length(btrim(first_name)) >= 1);

create function workspace_private.sync_student_name() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.first_name := btrim(new.first_name);
  new.surname := btrim(new.surname);
  new.full_name := btrim(new.first_name || ' ' || new.surname);
  return new;
end;
$$;
create trigger sync_student_name before insert or update of first_name, surname, full_name on public.students
  for each row execute function workspace_private.sync_student_name();

create function workspace_private.guard_drive_link() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.drive_link is distinct from old.drive_link and not public.is_admin() then
    raise exception 'Only an admin can change the Drive link.';
  end if;
  return new;
end;
$$;
create trigger guard_drive_link before update of drive_link on public.students
  for each row execute function workspace_private.guard_drive_link();

revoke update (full_name) on public.students from authenticated;
grant update (first_name, surname, applicant_type, drive_link) on public.students to authenticated;

drop function public.accept_student_submission(uuid, text, text, text, date, uuid[]);
drop function public.dismiss_student_submission(uuid);
drop function public.submit_student_form(text, text, text, jsonb);
drop function public.create_student(text, text, text, date, uuid[]);

create function public.create_student(p_first_name text, p_surname text, p_email text, p_phone text,
  p_file_opened_at date, p_applicant_type text, p_drive_link text, p_worker_ids uuid[]) returns uuid
language plpgsql security definer set search_path = '' as $$
declare student_id uuid;
begin
  if not public.is_admin() then raise exception 'Only an admin can open a student file.' using errcode = '42501'; end if;
  if length(btrim(coalesce(p_first_name, ''))) not between 1 and 100 then raise exception 'Enter the name.'; end if;
  if length(btrim(coalesce(p_surname, ''))) not between 1 and 100 then raise exception 'Enter the surname.'; end if;
  if p_applicant_type is null or p_applicant_type not in ('eu_equivalent', 'international') then
    raise exception 'Choose whether the applicant is EU equivalent or international.';
  end if;
  insert into public.students(first_name, surname, full_name, email, phone, file_opened_at, applicant_type, drive_link, created_by)
    values (p_first_name, p_surname, '', btrim(coalesce(p_email, '')), btrim(coalesce(p_phone, '')), p_file_opened_at,
      p_applicant_type, nullif(btrim(coalesce(p_drive_link, '')), ''), auth.uid()) returning id into student_id;
  perform public.set_student_workers(student_id, coalesce(p_worker_ids, '{}'));
  return student_id;
end;
$$;

-- Per admin: files opened after this instant are shown as new on the dashboard.
create table public.admin_alert_reads (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  student_files_seen_at timestamptz not null
);
revoke all on public.admin_alert_reads from anon, authenticated;
grant select on public.admin_alert_reads to authenticated;
alter table public.admin_alert_reads enable row level security;
create policy alert_reads_own on public.admin_alert_reads for select to authenticated
  using (profile_id = (select auth.uid()) and public.is_admin());
-- Existing admins start with nothing new, rather than every file ever opened.
insert into public.admin_alert_reads(profile_id, student_files_seen_at)
  select id, now() from public.profiles where role in ('admin', 'superadmin');

-- p_until is the newest file the admin was shown, so a file opened while the
-- dashboard was open stays new. Never moves backwards or into the future.
create function public.mark_student_files_seen(p_until timestamptz) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Only an admin has student file notifications.' using errcode = '42501'; end if;
  if p_until is null then raise exception 'Choose which notifications to mark as seen.'; end if;
  insert into public.admin_alert_reads(profile_id, student_files_seen_at) values (auth.uid(), least(p_until, now()))
  on conflict (profile_id) do update set student_files_seen_at =
    greatest(public.admin_alert_reads.student_files_seen_at, excluded.student_files_seen_at);
end;
$$;

revoke all on all functions in schema workspace_private from public, anon, authenticated;
revoke all on function public.create_student(text, text, text, text, date, text, text, uuid[]),
  public.mark_student_files_seen(timestamptz) from public, anon;
grant execute on function public.create_student(text, text, text, text, date, text, text, uuid[]),
  public.mark_student_files_seen(timestamptz) to authenticated;
commit;
