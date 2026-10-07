-- Remove a worker from the workspace without deleting anything (owner's
-- choice, 2026-10-09: "Remove, keep history"). Records are never deleted.
--
-- A removed worker:
--   * is made inactive, so they lose all workspace access at once
--     (current_user_role() returns null for an inactive account);
--   * leaves the Workers roster, workload panels and assignment dropdowns;
--   * keeps their name on notes, activity and past assignments. Files still
--     assigned to them surface on the Admin dashboard for manual reassignment,
--     exactly as for any inactive worker.
-- Only an Admin removes or restores. Restoring does NOT reactivate the
-- account: the Admin sets Active afterwards, deliberately.
--
-- Additive. Apply before deploying the app code that reads removed_at.
begin;

alter table public.worker_details
  add column removed_at timestamptz,
  add column removed_by uuid references public.profiles(id),
  add constraint worker_details_removed_pair check ((removed_at is null) = (removed_by is null));

create function public.set_worker_removed(p_worker_id uuid, p_removed boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Only an admin can remove workers.' using errcode = '42501'; end if;
  if p_worker_id = auth.uid() then raise exception 'You cannot remove yourself.'; end if;
  perform 1 from public.profiles where id = p_worker_id and role = 'staff' for update;
  if not found then raise exception 'Staff account not found.'; end if;
  if p_removed then
    update public.profiles set status = 'inactive' where id = p_worker_id;
    insert into public.worker_details as d (profile_id, removed_at, removed_by)
    values (p_worker_id, now(), auth.uid())
    on conflict (profile_id) do update
      set removed_at = coalesce(d.removed_at, now()),
          removed_by = coalesce(d.removed_by, auth.uid()),
          updated_at = now();
  else
    update public.worker_details set removed_at = null, removed_by = null, updated_at = now()
    where profile_id = p_worker_id;
  end if;
end;
$$;

-- Same as 20260930100000, plus one rule: a removed worker cannot be made
-- active until they are restored.
create or replace function public.save_worker(p_worker_id uuid, p_full_name text, p_phone text,
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
  if p_status = 'active' and exists (select 1 from public.worker_details
      where profile_id = p_worker_id and removed_at is not null) then
    raise exception 'Restore this worker before making them active.';
  end if;
  update public.profiles set full_name = btrim(p_full_name), status = p_status where id = p_worker_id;
  insert into public.worker_details as d (profile_id, phone, joined_on, left_on, gender, address)
  values(p_worker_id, btrim(p_phone), p_joined_on, p_left_on, coalesce(p_gender, ''), coalesce(btrim(p_address), ''))
  on conflict (profile_id) do update set phone = excluded.phone,
    joined_on = excluded.joined_on, left_on = excluded.left_on,
    gender = coalesce(p_gender, d.gender),
    address = coalesce(btrim(p_address), d.address), updated_at = now();
end;
$$;

revoke all on function public.set_worker_removed(uuid, boolean) from public, anon, authenticated;
grant execute on function public.set_worker_removed(uuid, boolean) to authenticated;

commit;
