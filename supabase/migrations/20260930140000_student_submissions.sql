-- Owner request, 2026-09-30: the agency's existing Google Form for new
-- students feeds the workspace. A script on the form posts each response to
-- /api/student-form; the Admin sees it on the dashboard, then opens a student
-- file from it and assigns workers.
--
-- A submission is NOT a student file and is visible to the Admin only. Like the
-- staff details form, the entry point needs no session, so it validates its
-- input, caps the queue, and is the only way the public can write this table.
begin;

create table public.student_submissions (
  id uuid primary key default gen_random_uuid(),
  -- Best guesses picked out of the answers, for the list. The Admin confirms
  -- them when opening the file; `answers` is the record of what was sent.
  full_name text not null default '' check (length(full_name) <= 200),
  email text not null default '' check (length(email) <= 320),
  phone text not null default '' check (length(phone) <= 80),
  -- [{ "question": text, "answer": text }, ...] in form order.
  answers jsonb not null check (jsonb_typeof(answers) = 'array'),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'dismissed')),
  student_id uuid references public.students(id),
  submitted_at timestamptz not null default now(),
  resolved_at timestamptz,
  check ((status = 'pending') = (resolved_at is null)),
  check ((status = 'accepted') = (student_id is not null))
);
create index pending_student_submissions on public.student_submissions(submitted_at desc) where status = 'pending';

-- Remove Supabase's broad default grants BEFORE granting the minimum needed.
revoke all on public.student_submissions from anon, authenticated;
grant select on public.student_submissions to authenticated;
alter table public.student_submissions enable row level security;
create policy submissions_read on public.student_submissions for select to authenticated
  using (public.is_admin());

create function public.submit_student_form(p_full_name text, p_email text, p_phone text, p_answers jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_answers is null or jsonb_typeof(p_answers) <> 'array'
     or jsonb_array_length(p_answers) not between 1 and 100
     or length(p_answers::text) > 40000 then
    raise exception 'Send between 1 and 100 answers.';
  end if;
  if exists (select 1 from jsonb_array_elements(p_answers) item
    where jsonb_typeof(item) <> 'object' or jsonb_typeof(item->'question') is distinct from 'string'
      or jsonb_typeof(item->'answer') is distinct from 'string') then
    raise exception 'Each answer needs a question and an answer.';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('student_submissions', 0));
  if (select count(*) from public.student_submissions where status = 'pending') >= 200 then
    raise exception 'New forms cannot be taken right now.';
  end if;
  insert into public.student_submissions(full_name, email, phone, answers)
    values (left(btrim(coalesce(p_full_name, '')), 200), left(btrim(coalesce(p_email, '')), 320),
      left(btrim(coalesce(p_phone, '')), 80), p_answers);
end;
$$;

-- Opens the student file, assigns the chosen workers, keeps the form answers
-- on the file as its first note, and closes the submission — all or nothing.
create function public.accept_student_submission(p_id uuid, p_full_name text, p_email text, p_phone text,
  p_file_opened_at date, p_worker_ids uuid[]) returns uuid
language plpgsql security definer set search_path = '' as $$
declare submission public.student_submissions; new_student uuid; summary text;
begin
  if not public.is_admin() then raise exception 'Only an admin can open a student file.' using errcode = '42501'; end if;
  select * into submission from public.student_submissions where id = p_id and status = 'pending' for update;
  if not found then raise exception 'This form was not found or was already handled. Reload the page.'; end if;
  new_student := public.create_student(p_full_name, p_email, p_phone, p_file_opened_at, p_worker_ids);
  select string_agg((item->>'question') || ': ' || (item->>'answer'), E'\n' order by position)
    into summary from jsonb_array_elements(submission.answers) with ordinality as a(item, position);
  insert into public.student_notes(student_id, author_id, body)
    values (new_student, auth.uid(), left('Student form, sent ' || to_char(submission.submitted_at at time zone 'UTC', 'YYYY-MM-DD') || E'\n\n' || summary, 10000));
  update public.student_submissions set status = 'accepted', student_id = new_student, resolved_at = now() where id = p_id;
  return new_student;
end;
$$;

create function public.dismiss_student_submission(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Only an admin can handle student forms.' using errcode = '42501'; end if;
  update public.student_submissions set status = 'dismissed', resolved_at = now() where id = p_id and status = 'pending';
  if not found then raise exception 'This form was not found or was already handled. Reload the page.'; end if;
end;
$$;

revoke all on function public.submit_student_form(text, text, text, jsonb),
  public.accept_student_submission(uuid, text, text, text, date, uuid[]),
  public.dismiss_student_submission(uuid) from public, anon, authenticated;
grant execute on function public.submit_student_form(text, text, text, jsonb) to anon, authenticated;
grant execute on function public.accept_student_submission(uuid, text, text, text, date, uuid[]),
  public.dismiss_student_submission(uuid) to authenticated;
commit;
