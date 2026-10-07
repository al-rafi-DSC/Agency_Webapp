-- Owner request, 2026-10-07: every worker gets a Main Drive Link from the
-- Admin when they join. It belongs to the worker, not to a student file:
--   * only an Admin sets or changes it (save_worker(); worker_details has no
--     UPDATE grant for authenticated, so there is no other write path);
--   * the worker reads their own on "My students" (workers_read already limits
--     staff to their own worker_details row).
-- Each student file's Student Drive Link (20261010100000) is unchanged.
--
-- save_worker() gains p_main_drive_link (default null = keep the current
-- link), so the previous app code keeps working until the new code deploys.
-- Additive. Apply before deploying the app code that reads main_drive_link.
begin;

alter table public.worker_details
  add column main_drive_link text
    check (main_drive_link ~ '^https://[^\s]+$' and length(main_drive_link) <= 2048);

drop function public.save_worker(uuid, text, text, date, date, public.account_status, text, text);

-- Same as 20261009100000, plus the Main Drive Link. '' clears it.
create function public.save_worker(p_worker_id uuid, p_full_name text, p_phone text,
  p_joined_on date, p_left_on date, p_status public.account_status,
  p_gender text default null, p_address text default null, p_main_drive_link text default null) returns void
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
  if p_status = 'active' and exists (select 1 from public.worker_details
      where profile_id = p_worker_id and removed_at is not null) then
    raise exception 'Restore this worker before making them active.';
  end if;
  update public.profiles set full_name = btrim(p_full_name), status = p_status where id = p_worker_id;
  insert into public.worker_details as d (profile_id, phone, joined_on, left_on, gender, address, main_drive_link)
  values(p_worker_id, btrim(p_phone), p_joined_on, p_left_on, coalesce(p_gender, ''), coalesce(btrim(p_address), ''),
    nullif(btrim(coalesce(p_main_drive_link, '')), ''))
  on conflict (profile_id) do update set phone = excluded.phone,
    joined_on = excluded.joined_on, left_on = excluded.left_on,
    gender = coalesce(p_gender, d.gender),
    address = coalesce(btrim(p_address), d.address),
    main_drive_link = case when p_main_drive_link is null then d.main_drive_link
      else nullif(btrim(p_main_drive_link), '') end,
    updated_at = now();
end;
$$;

revoke all on function public.save_worker(uuid, text, text, date, date, public.account_status, text, text, text) from public, anon, authenticated;
grant execute on function public.save_worker(uuid, text, text, date, date, public.account_status, text, text, text) to authenticated;

commit;
