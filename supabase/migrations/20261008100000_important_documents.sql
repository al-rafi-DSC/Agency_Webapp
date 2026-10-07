-- Owner request, 2026-10-08: an "Important documents" page in both the Admin
-- and Staff panels, listing shared Google Drive files (agency-wide, not tied
-- to a student). Every active account can open them; only an admin adds,
-- renames, reorders or archives them. Records are never deleted: an archived
-- document is hidden from staff and restorable by an admin.
-- Seeded with the four files the owner supplied, as "Document 1"–"Document 4"
-- in the order given; the admin renames them in the app.
begin;

create table public.important_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) between 1 and 200),
  url text not null check (url ~ '^https://[^\s]+$' and length(url) <= 2048),
  sort_order integer not null default 0,
  created_by uuid default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  archived_by uuid references public.profiles(id),
  check ((archived_at is null) = (archived_by is null))
);
create index important_documents_order on public.important_documents(sort_order, created_at);

revoke all on public.important_documents from anon, authenticated;
grant select on public.important_documents to authenticated;
grant insert (title, url, sort_order) on public.important_documents to authenticated;
grant update (title, url, sort_order) on public.important_documents to authenticated;
-- archived_at/archived_by: no grant; only set_archived() changes them.
alter table public.important_documents enable row level security;

create policy important_documents_read on public.important_documents for select to authenticated
  using (public.current_user_role() is not null and (archived_at is null or public.is_admin()));
create policy important_documents_add on public.important_documents for insert to authenticated
  with check (public.is_admin());
create policy important_documents_edit on public.important_documents for update to authenticated
  using (public.is_admin() and archived_at is null) with check (public.is_admin());

create trigger important_documents_updated before update on public.important_documents
  for each row execute function public.set_updated_at();

-- Same as 20260911090000, plus 'important_document'.
create or replace function public.set_archived(p_kind text, p_id uuid, p_archived boolean) returns void
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
  elsif p_kind = 'important_document' then
    update public.important_documents set archived_at = stamp, archived_by = actor where id = p_id and (archived_at is null) = p_archived;
  else
    raise exception 'Unknown record type.';
  end if;
  if not found then raise exception 'This record was not found or was already changed. Reload the page.'; end if;
end;
$$;

insert into public.important_documents(title, url, sort_order, created_by) values
  ('Document 1', 'https://drive.google.com/file/d/16tyLCB_ooyG5WzBj81i5SA1vHAyCsXwx/view', 1, null),
  ('Document 2', 'https://drive.google.com/file/d/1QdpEhDzW9SK0dq5Tzq0S0LJwNxG9U75l/view', 2, null),
  ('Document 3', 'https://drive.google.com/file/d/1Z1d3LeQ2utlRpS-ccfpuSeyXv2bK6p1X/view', 3, null),
  ('Document 4', 'https://drive.google.com/file/d/1hITBUAcc3mmeyBL9I4FzzbvqUC3w6YlX/view', 4, null);
commit;
