-- Owner request, 2026-09-30: a new staff member fills in a form before they
-- have an account. The Admin sends them the form link by hand; it is not linked
-- from any page. The Admin sees the request on the dashboard and adds the email
-- in Supabase Auth; the account then picks up the submitted name, phone, gender
-- and address, so the worker sees their name on first sign-in.
--
-- The form creates NO account and grants NO access. It is the one table the
-- public can write to, and only through submit_staff_registration() below.
begin;

alter table public.worker_details
  add column gender text not null default '' check (gender in ('', 'male', 'female', 'other')),
  add column address text not null default '' check (length(address) <= 500);

create table public.staff_registrations (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (length(btrim(full_name)) between 2 and 200),
  email text not null check (email = lower(btrim(email)) and length(email) <= 320 and email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  phone text not null check (length(phone) between 3 and 80),
  gender text not null check (gender in ('male', 'female', 'other')),
  address text not null check (length(address) between 3 and 500),
  status text not null default 'pending' check (status in ('pending', 'linked', 'dismissed')),
  profile_id uuid references public.profiles(id),
  submitted_at timestamptz not null default now(),
  resolved_at timestamptz,
  check ((status = 'pending') = (resolved_at is null)),
  check ((status = 'linked') = (profile_id is not null))
);
create unique index one_pending_registration on public.staff_registrations(email) where status = 'pending';

-- Remove Supabase's broad default grants BEFORE granting the minimum needed.
revoke all on public.staff_registrations from anon, authenticated;
grant select on public.staff_registrations to authenticated;
alter table public.staff_registrations enable row level security;
create policy registrations_read on public.staff_registrations for select to authenticated
  using (public.is_admin());

-- The public entry point. Callable without a session, so it validates
-- everything itself, never reports whether an address is already known, and
-- caps the queue: the form cannot be used to fill the database.
create function public.submit_staff_registration(p_full_name text, p_email text, p_phone text,
  p_gender text, p_address text) returns void
language plpgsql security definer set search_path = '' as $$
declare clean_name text := btrim(coalesce(p_full_name, ''));
  clean_email text := lower(btrim(coalesce(p_email, '')));
  clean_phone text := btrim(coalesce(p_phone, ''));
  clean_address text := btrim(coalesce(p_address, ''));
begin
  if length(clean_name) not between 2 and 200 then raise exception 'Enter your full name.'; end if;
  if length(clean_email) > 320 or clean_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then raise exception 'Enter a valid email address.'; end if;
  if length(clean_phone) not between 3 and 80 then raise exception 'Enter your phone number.'; end if;
  if p_gender is null or p_gender not in ('male', 'female', 'other') then raise exception 'Choose a gender.'; end if;
  if length(clean_address) not between 3 and 500 then raise exception 'Enter your address.'; end if;
  perform pg_advisory_xact_lock(hashtextextended('staff_registrations', 0));
  -- Sending the form again corrects the waiting request instead of adding one.
  update public.staff_registrations set full_name = clean_name, phone = clean_phone,
    gender = p_gender, address = clean_address, submitted_at = now()
    where email = clean_email and status = 'pending';
  if found then return; end if;
  if (select count(*) from public.staff_registrations where status = 'pending') >= 50 then
    raise exception 'New requests cannot be taken right now.';
  end if;
  insert into public.staff_registrations(full_name, email, phone, gender, address)
    values (clean_name, clean_email, clean_phone, p_gender, clean_address);
end;
$$;

-- Same as before, plus: a new STAFF account whose email has a waiting request
-- takes its name, phone, gender and address from that request. A name given on an invite wins.
-- The role still comes only from raw_app_meta_data, never from the form.
create or replace function public.handle_new_user()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  granted_role public.user_role;
  given_name text := coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), '');
  request public.staff_registrations;
begin
  begin
    granted_role := coalesce(
      (new.raw_app_meta_data ->> 'role')::public.user_role,
      'staff'::public.user_role
    );
  exception when invalid_text_representation then
    granted_role := 'staff'::public.user_role;
  end;

  if granted_role = 'staff' and new.email is not null then
    select * into request from public.staff_registrations
      where email = lower(btrim(new.email)) and status = 'pending' for update;
  end if;

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    case when given_name = '' then coalesce(request.full_name, '') else given_name end,
    granted_role
  )
  on conflict (id) do nothing;

  if request.id is not null then
    insert into public.worker_details(profile_id, phone, gender, address)
      values (new.id, request.phone, request.gender, request.address)
      on conflict (profile_id) do nothing;
    update public.staff_registrations set status = 'linked', profile_id = new.id, resolved_at = now()
      where id = request.id;
  end if;

  return new;
end;
$$;

-- Admin handling of a waiting request: 'dismiss' it, or 'link' it to a staff
-- account that already existed before the form was sent. Nothing is deleted.
create function public.resolve_staff_registration(p_id uuid, p_action text) returns void
language plpgsql security definer set search_path = '' as $$
declare request public.staff_registrations; worker uuid;
begin
  if not public.is_admin() then raise exception 'Only an admin can handle staff requests.' using errcode = '42501'; end if;
  select * into request from public.staff_registrations where id = p_id and status = 'pending' for update;
  if not found then raise exception 'This request was not found or was already handled. Reload the page.'; end if;
  if p_action = 'dismiss' then
    update public.staff_registrations set status = 'dismissed', resolved_at = now() where id = p_id;
  elsif p_action = 'link' then
    select id into worker from public.profiles where lower(email) = request.email and role = 'staff';
    if not found then raise exception 'No staff account uses this email yet. Add the email in Supabase first.'; end if;
    update public.profiles set full_name = request.full_name where id = worker;
    insert into public.worker_details(profile_id, phone, gender, address)
      values (worker, request.phone, request.gender, request.address)
      on conflict (profile_id) do update set phone = excluded.phone, gender = excluded.gender,
        address = excluded.address, updated_at = now();
    update public.staff_registrations set status = 'linked', profile_id = worker, resolved_at = now() where id = p_id;
  else
    raise exception 'Unknown action.';
  end if;
end;
$$;

-- save_worker gains gender and address so an Admin can correct them. Both are
-- optional and null leaves the stored value alone, so existing callers keep working.
drop function public.save_worker(uuid, text, text, date, date, public.account_status);
create function public.save_worker(p_worker_id uuid, p_full_name text, p_phone text,
  p_joined_on date, p_left_on date, p_status public.account_status,
  p_gender text default null, p_address text default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Only an admin can manage workers.' using errcode = '42501'; end if;
  if length(btrim(p_full_name)) not between 2 and 200 then raise exception 'Enter a full name.'; end if;
  if p_gender is not null and p_gender not in ('', 'male', 'female', 'other') then raise exception 'Choose a gender.'; end if;
  if length(btrim(p_address)) > 500 then raise exception 'Enter a shorter address.'; end if;
  perform 1 from public.profiles where id = p_worker_id and role = 'staff' for update;
  if not found then raise exception 'Staff account not found.'; end if;
  if p_worker_id = auth.uid() and p_status = 'inactive' then raise exception 'You cannot deactivate yourself.'; end if;
  if p_left_on is not null and p_status <> 'inactive' then raise exception 'A departed worker must be inactive.'; end if;
  update public.profiles set full_name = btrim(p_full_name), status = p_status where id = p_worker_id;
  insert into public.worker_details as d (profile_id, phone, joined_on, left_on, gender, address)
  values(p_worker_id, btrim(p_phone), p_joined_on, p_left_on, coalesce(p_gender, ''), coalesce(btrim(p_address), ''))
  on conflict (profile_id) do update set phone = excluded.phone,
    joined_on = excluded.joined_on, left_on = excluded.left_on,
    gender = coalesce(p_gender, d.gender),
    address = coalesce(btrim(p_address), d.address), updated_at = now();
end;
$$;

revoke all on function public.submit_staff_registration(text, text, text, text, text),
  public.resolve_staff_registration(uuid, text),
  public.save_worker(uuid, text, text, date, date, public.account_status, text, text) from public, anon, authenticated;
grant execute on function public.submit_staff_registration(text, text, text, text, text) to anon, authenticated;
grant execute on function public.resolve_staff_registration(uuid, text),
  public.save_worker(uuid, text, text, date, date, public.account_status, text, text) to authenticated;
commit;
