-- Worker, Student and Yearly Summary sections in the existing database.
-- Apply after 20260907120000_auth_identity.sql. No sample people or placeholder
-- workflow vocabulary are inserted. All dates shown in reports use UTC.
begin;

create schema if not exists workspace_private;
revoke all on schema workspace_private from public, anon, authenticated;

create or replace function public.current_user_role() returns public.user_role
language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = auth.uid() and status = 'active';
$$;

create table public.worker_details (
  profile_id uuid primary key references public.profiles(id),
  phone text not null default '' check (length(phone) <= 80),
  joined_on date,
  left_on date,
  updated_at timestamptz not null default now(),
  check (left_on is null or (joined_on is not null and left_on >= joined_on))
);

create table public.workflow_statuses (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('application', 'scholarship')),
  label text not null check (length(btrim(label)) between 1 and 80),
  counts_as_submitted boolean not null default false,
  counts_as_awarded boolean not null default false,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  check (category = 'application' or not counts_as_submitted),
  check (category = 'scholarship' or not counts_as_awarded)
);
create unique index workflow_status_label on public.workflow_statuses(category, lower(btrim(label)));

create table public.students (
  id uuid primary key default gen_random_uuid(),
  file_number bigint generated always as identity unique,
  full_name text not null check (length(btrim(full_name)) between 2 and 200),
  email text not null default '' check (length(email) <= 320),
  phone text not null default '' check (length(phone) <= 80),
  photo_url text,
  file_opened_at date not null default current_date,
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (photo_url is null or photo_url ~ '^https://')
);

create table public.student_staff_assignments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id),
  worker_id uuid not null references public.profiles(id),
  assigned_by uuid not null default auth.uid() references public.profiles(id),
  assigned_at timestamptz not null default now(),
  ended_at timestamptz,
  check (ended_at is null or ended_at >= assigned_at)
);
create unique index one_current_assignment on public.student_staff_assignments(student_id, worker_id) where ended_at is null;
create index assignment_worker on public.student_staff_assignments(worker_id, student_id) where ended_at is null;

create or replace function public.can_access_student(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.current_user_role() is not null and (
    public.is_admin() or exists (
      select 1 from public.student_staff_assignments
      where student_id = target and worker_id = auth.uid() and ended_at is null
    )
  );
$$;
revoke all on function public.can_access_student(uuid) from public, anon;
grant execute on function public.can_access_student(uuid) to authenticated;

create table public.university_applications (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id),
  university_name text not null check (length(btrim(university_name)) between 2 and 240),
  application_link text,
  application_status_id uuid references public.workflow_statuses(id),
  scholarship_status_id uuid references public.workflow_statuses(id),
  decision_status text not null default 'pending' check (decision_status in ('pending', 'accepted', 'rejected')),
  admission_confirmed boolean not null default false,
  is_submitted boolean not null default false,
  is_awarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not admission_confirmed or decision_status = 'accepted'),
  check (application_link is null or application_link ~ '^https?://')
);
create index applications_student on public.university_applications(student_id);

-- Audit snapshots are written only by the database, including writes made
-- directly through the Data API. Clients cannot forge actors or timestamps.
create table public.application_history (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.university_applications(id),
  student_id uuid not null references public.students(id),
  actor_id uuid references public.profiles(id),
  occurred_at timestamptz not null default now(),
  before_data jsonb,
  after_data jsonb not null
);
create index history_student_date on public.application_history(student_id, occurred_at desc);
create index history_date on public.application_history(occurred_at);

create table public.student_notes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id),
  author_id uuid not null default auth.uid() references public.profiles(id),
  body text not null check (length(btrim(body)) between 1 and 10000),
  created_at timestamptz not null default now()
);
create index notes_student on public.student_notes(student_id, created_at desc);

create table public.student_documents (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id),
  name text not null check (length(name) between 1 and 240),
  storage_path text not null unique,
  mime_type text not null,
  size_bytes integer not null check (size_bytes between 1 and 4194304),
  uploaded_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  check (split_part(storage_path, '/', 1) = student_id::text)
);
create index documents_student on public.student_documents(student_id);

create table public.yearly_reports (
  id uuid primary key default gen_random_uuid(),
  label text not null check (length(btrim(label)) between 1 and 120),
  period_start date not null,
  period_end date not null,
  version integer not null check (version > 0),
  payload jsonb not null,
  generated_at timestamptz not null default now(),
  generated_by uuid not null references public.profiles(id),
  approved_at timestamptz,
  approved_by uuid references public.profiles(id),
  check (period_end >= period_start and period_end - period_start <= 732),
  check ((approved_at is null) = (approved_by is null)),
  unique (period_start, period_end, version)
);

-- Remove Supabase's broad default grants BEFORE granting the minimum needed.
revoke all on public.worker_details, public.workflow_statuses, public.students,
  public.student_staff_assignments, public.university_applications,
  public.application_history, public.student_notes, public.student_documents,
  public.yearly_reports from anon, authenticated;
grant select on public.worker_details, public.workflow_statuses, public.students,
  public.student_staff_assignments, public.university_applications,
  public.application_history, public.student_notes, public.student_documents,
  public.yearly_reports to authenticated;
grant update (full_name, email, phone, photo_url, file_opened_at) on public.students to authenticated;
grant insert (student_id, university_name, application_link, application_status_id,
  scholarship_status_id, decision_status, admission_confirmed) on public.university_applications to authenticated;
grant update (university_name, application_link, application_status_id,
  scholarship_status_id, decision_status, admission_confirmed) on public.university_applications to authenticated;
grant insert (student_id, body) on public.student_notes to authenticated;
grant insert (student_id, name, storage_path, mime_type, size_bytes) on public.student_documents to authenticated;

alter table public.worker_details enable row level security;
alter table public.workflow_statuses enable row level security;
alter table public.students enable row level security;
alter table public.student_staff_assignments enable row level security;
alter table public.university_applications enable row level security;
alter table public.application_history enable row level security;
alter table public.student_notes enable row level security;
alter table public.student_documents enable row level security;
alter table public.yearly_reports enable row level security;

create policy workers_read on public.worker_details for select to authenticated
  using (public.current_user_role() is not null and (profile_id = auth.uid() or public.is_admin()));
create policy statuses_read on public.workflow_statuses for select to authenticated
  using (public.current_user_role() is not null);
create policy students_read on public.students for select to authenticated
  using (public.can_access_student(id));
create policy students_edit on public.students for update to authenticated
  using (public.can_access_student(id)) with check (public.can_access_student(id));
-- Staff receive their own assignment records only; co-worker identity remains
-- private until the owner decides whether staff should see co-assigned names.
create policy assignments_read on public.student_staff_assignments for select to authenticated
  using (public.current_user_role() is not null and (public.is_admin() or worker_id = auth.uid()));
create policy applications_read on public.university_applications for select to authenticated
  using (public.can_access_student(student_id));
create policy applications_add on public.university_applications for insert to authenticated
  with check (public.can_access_student(student_id));
create policy applications_edit on public.university_applications for update to authenticated
  using (public.can_access_student(student_id)) with check (public.can_access_student(student_id));
create policy history_read on public.application_history for select to authenticated
  using (public.can_access_student(student_id));
create policy notes_read on public.student_notes for select to authenticated
  using (public.can_access_student(student_id));
create policy notes_add on public.student_notes for insert to authenticated
  with check (public.can_access_student(student_id) and author_id = auth.uid());
create policy documents_read on public.student_documents for select to authenticated
  using (public.can_access_student(student_id));
create policy documents_add on public.student_documents for insert to authenticated
  with check (public.can_access_student(student_id) and uploaded_by = auth.uid());
create policy reports_read on public.yearly_reports for select to authenticated
  using (public.is_admin());

create function workspace_private.validate_application() returns trigger
language plpgsql security definer set search_path = '' as $$
declare app_status public.workflow_statuses; scholarship public.workflow_statuses;
begin
  new.updated_at := clock_timestamp();
  new.is_submitted := false;
  new.is_awarded := false;
  if new.application_status_id is not null then
    select * into app_status from public.workflow_statuses where id = new.application_status_id and category = 'application';
    if not found then raise exception 'Choose an application status.'; end if;
    if app_status.archived and (tg_op = 'INSERT' or new.application_status_id is distinct from old.application_status_id) then
      raise exception 'This application status is archived.';
    end if;
    new.is_submitted := app_status.counts_as_submitted;
  end if;
  if new.scholarship_status_id is not null then
    select * into scholarship from public.workflow_statuses where id = new.scholarship_status_id and category = 'scholarship';
    if not found then raise exception 'Choose a scholarship status.'; end if;
    if scholarship.archived and (tg_op = 'INSERT' or new.scholarship_status_id is distinct from old.scholarship_status_id) then
      raise exception 'This scholarship status is archived.';
    end if;
    new.is_awarded := scholarship.counts_as_awarded;
  end if;
  return new;
end;
$$;
create trigger validate_application before insert or update on public.university_applications
  for each row execute function workspace_private.validate_application();

create function workspace_private.record_application() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and (to_jsonb(old) - 'updated_at') = (to_jsonb(new) - 'updated_at') then return new; end if;
  insert into public.application_history(application_id, student_id, actor_id, before_data, after_data)
  values (new.id, new.student_id, auth.uid(), case when tg_op = 'UPDATE' then to_jsonb(old) else null end, to_jsonb(new));
  return new;
end;
$$;
create trigger record_application after insert or update on public.university_applications
  for each row execute function workspace_private.record_application();
create trigger students_updated before update on public.students for each row execute function public.set_updated_at();

-- Only these atomic RPCs can create students, change assignments, or administer
-- workers/status vocabulary. Every SECURITY DEFINER entry checks the caller.
create function public.set_student_workers(p_student_id uuid, p_worker_ids uuid[]) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Only an admin can assign workers.' using errcode = '42501'; end if;
  perform 1 from public.students where id = p_student_id for update;
  if not found then raise exception 'Student not found.'; end if;
  if p_worker_ids is null then raise exception 'Provide the selected workers.'; end if;
  if exists (select 1 from unnest(p_worker_ids) w where not exists (
    select 1 from public.profiles p where p.id = w and p.role = 'staff' and p.status = 'active'
  )) then raise exception 'Assignments require active staff accounts.'; end if;
  update public.student_staff_assignments set ended_at = now()
    where student_id = p_student_id and ended_at is null and not (worker_id = any(p_worker_ids));
  insert into public.student_staff_assignments(student_id, worker_id, assigned_by)
    select p_student_id, w, auth.uid() from (select distinct unnest(p_worker_ids) w) selected
    where not exists (select 1 from public.student_staff_assignments a
      where a.student_id = p_student_id and a.worker_id = w and a.ended_at is null);
end;
$$;

create function public.create_student(p_full_name text, p_email text, p_phone text,
  p_file_opened_at date, p_worker_ids uuid[]) returns uuid
language plpgsql security definer set search_path = '' as $$
declare student_id uuid;
begin
  if not public.is_admin() then raise exception 'Only an admin can open a student file.' using errcode = '42501'; end if;
  insert into public.students(full_name, email, phone, file_opened_at, created_by)
    values (btrim(p_full_name), btrim(p_email), btrim(p_phone), p_file_opened_at, auth.uid()) returning id into student_id;
  perform public.set_student_workers(student_id, p_worker_ids);
  return student_id;
end;
$$;

create function public.save_worker(p_worker_id uuid, p_full_name text, p_phone text,
  p_joined_on date, p_left_on date, p_status public.account_status) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Only an admin can manage workers.' using errcode = '42501'; end if;
  if length(btrim(p_full_name)) not between 2 and 200 then raise exception 'Enter a full name.'; end if;
  perform 1 from public.profiles where id = p_worker_id and role = 'staff' for update;
  if not found then raise exception 'Staff account not found.'; end if;
  if p_worker_id = auth.uid() and p_status = 'inactive' then raise exception 'You cannot deactivate yourself.'; end if;
  if p_left_on is not null and p_status <> 'inactive' then raise exception 'A departed worker must be inactive.'; end if;
  update public.profiles set full_name = btrim(p_full_name), status = p_status where id = p_worker_id;
  insert into public.worker_details(profile_id, phone, joined_on, left_on)
  values(p_worker_id, btrim(p_phone), p_joined_on, p_left_on)
  on conflict (profile_id) do update set phone = excluded.phone,
    joined_on = excluded.joined_on, left_on = excluded.left_on, updated_at = now();
end;
$$;

create function public.add_workflow_status(p_category text, p_label text, p_submitted boolean, p_awarded boolean) returns uuid
language plpgsql security definer set search_path = '' as $$
declare status_id uuid;
begin
  if not public.is_admin() then raise exception 'Only an admin can manage statuses.' using errcode = '42501'; end if;
  insert into public.workflow_statuses(category, label, counts_as_submitted, counts_as_awarded)
    values(p_category, btrim(p_label), p_submitted, p_awarded) returning id into status_id;
  return status_id;
end;
$$;
create function public.archive_workflow_status(p_id uuid, p_archived boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Only an admin can manage statuses.' using errcode = '42501'; end if;
  update public.workflow_statuses set archived = p_archived where id = p_id;
  if not found then raise exception 'Status not found.'; end if;
end;
$$;

-- Event counts use distinct application IDs per event category within the
-- period, never the current status. A later change cannot move a past event
-- into another year. Worker activity counts are not outcome attribution.
create function workspace_private.report_payload(p_start date, p_end date) returns jsonb
language sql stable security definer set search_path = '' as $$
  with events as (
    select *,
      (after_data->>'is_submitted')::boolean and not coalesce((before_data->>'is_submitted')::boolean, false) as submitted,
      after_data->>'decision_status' = 'accepted' and coalesce(before_data->>'decision_status', '') <> 'accepted' as accepted,
      after_data->>'decision_status' = 'rejected' and coalesce(before_data->>'decision_status', '') <> 'rejected' as rejected,
      (after_data->>'admission_confirmed')::boolean and not coalesce((before_data->>'admission_confirmed')::boolean, false) as confirmed,
      (after_data->>'is_awarded')::boolean and not coalesce((before_data->>'is_awarded')::boolean, false) as awarded
    from public.application_history
    where occurred_at >= p_start::timestamp at time zone 'UTC'
      and occurred_at < (p_end + 1)::timestamp at time zone 'UTC'
  ), totals as (
    select count(distinct application_id) filter (where submitted) as applications_submitted,
      count(distinct application_id) filter (where accepted) as offers_received,
      count(distinct application_id) filter (where rejected) as rejections_received,
      count(distinct application_id) filter (where confirmed) as admissions_confirmed,
      count(distinct application_id) filter (where awarded) as scholarships_awarded from events
  ), workers as (
    select p.id, p.full_name,
      (select count(distinct a.student_id) from public.student_staff_assignments a where a.worker_id = p.id
        and a.assigned_at < (p_end + 1)::timestamp at time zone 'UTC'
        and (a.ended_at is null or a.ended_at > p_start::timestamp at time zone 'UTC')) as students_handled,
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
    'new_students', (select count(*) from public.students where file_opened_at between p_start and p_end),
    'students_handled', (select count(distinct student_id) from public.student_staff_assignments
      where assigned_at < (p_end + 1)::timestamp at time zone 'UTC'
      and (ended_at is null or ended_at > p_start::timestamp at time zone 'UTC')),
    'applications_submitted', t.applications_submitted, 'offers_received', t.offers_received,
    'rejections_received', t.rejections_received, 'admissions_confirmed', t.admissions_confirmed,
    'scholarships_awarded', t.scholarships_awarded,
    'workers', coalesce((select jsonb_agg(to_jsonb(w) order by w.full_name) from workers w), '[]'::jsonb),
    'universities', coalesce((select jsonb_agg(to_jsonb(u) order by u.university_name) from universities u), '[]'::jsonb)
  ) from totals t;
$$;

create function public.create_yearly_report(p_label text, p_start date, p_end date) returns uuid
language plpgsql security definer set search_path = '' as $$
declare report_id uuid; next_version integer;
begin
  if not public.is_admin() then raise exception 'Only an admin can create reports.' using errcode = '42501'; end if;
  if p_start is null or p_end is null or p_end < p_start or p_end - p_start > 732 then raise exception 'Choose a valid reporting period of at most two years.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_start::text || ':' || p_end::text, 0));
  select coalesce(max(version), 0) + 1 into next_version from public.yearly_reports where period_start = p_start and period_end = p_end;
  insert into public.yearly_reports(label, period_start, period_end, version, payload, generated_by)
    values(btrim(p_label), p_start, p_end, next_version, workspace_private.report_payload(p_start, p_end), auth.uid()) returning id into report_id;
  return report_id;
end;
$$;
create function public.refresh_yearly_report(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare report public.yearly_reports;
begin
  if not public.is_admin() then raise exception 'Only an admin can refresh reports.' using errcode = '42501'; end if;
  select * into report from public.yearly_reports where id = p_id for update;
  if not found or report.approved_at is not null then raise exception 'Only draft reports can be refreshed. Create a new version for corrections.'; end if;
  update public.yearly_reports set payload = workspace_private.report_payload(report.period_start, report.period_end),
    generated_at = now(), generated_by = auth.uid() where id = p_id;
end;
$$;
create function public.approve_yearly_report(p_id uuid, p_generated_at timestamptz) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Only an admin can approve reports.' using errcode = '42501'; end if;
  update public.yearly_reports set approved_at = now(), approved_by = auth.uid()
    where id = p_id and approved_at is null and generated_at = p_generated_at;
  if not found then raise exception 'This report changed or was already approved. Reload it before approving.'; end if;
end;
$$;

revoke all on all functions in schema workspace_private from public, anon, authenticated;
revoke all on function public.set_student_workers(uuid, uuid[]),
  public.create_student(text, text, text, date, uuid[]),
  public.save_worker(uuid, text, text, date, date, public.account_status),
  public.add_workflow_status(text, text, boolean, boolean), public.archive_workflow_status(uuid, boolean),
  public.create_yearly_report(text, date, date), public.refresh_yearly_report(uuid),
  public.approve_yearly_report(uuid, timestamptz) from public, anon;
grant execute on function public.set_student_workers(uuid, uuid[]),
  public.create_student(text, text, text, date, uuid[]),
  public.save_worker(uuid, text, text, date, date, public.account_status),
  public.add_workflow_status(text, text, boolean, boolean), public.archive_workflow_status(uuid, boolean),
  public.create_yearly_report(text, date, date), public.refresh_yearly_report(uuid),
  public.approve_yearly_report(uuid, timestamptz) to authenticated;
commit;
