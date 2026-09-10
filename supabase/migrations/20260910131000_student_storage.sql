-- Private document storage. A document is visible only while the caller has
-- access to its student. No public bucket or long-lived public download URL.
begin;
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('student-documents', 'student-documents', false, 4194304,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create function public.can_access_student_object(object_name text) returns boolean
language plpgsql stable security invoker set search_path = '' as $$
declare student_id uuid;
begin
  begin
    student_id := split_part(object_name, '/', 1)::uuid;
  exception when invalid_text_representation then return false;
  end;
  return public.can_access_student(student_id);
end;
$$;
revoke all on function public.can_access_student_object(text) from public, anon;
grant execute on function public.can_access_student_object(text) to authenticated;

create policy student_documents_download on storage.objects for select to authenticated
  using (bucket_id = 'student-documents' and public.can_access_student_object(name));
create policy student_documents_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'student-documents' and public.can_access_student_object(name));
-- Deletion is only used to clean up an upload whose metadata insert failed.
-- Existing linked documents cannot be removed through the storage API.
create policy student_documents_cleanup on storage.objects for delete to authenticated
  using (bucket_id = 'student-documents' and public.can_access_student_object(name)
    and not exists (select 1 from public.student_documents d where d.storage_path = storage.objects.name));
commit;
