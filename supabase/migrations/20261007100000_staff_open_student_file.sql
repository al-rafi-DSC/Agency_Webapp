-- Owner request, 2026-10-07:
-- 1. Staff can open a student file from "My students". The file is assigned
--    to the staff member who opened it, dated today (only an admin changes
--    the file-opened date) and carries no Drive link (admin-only).
-- 2. A student file records far more detail. Required to open a file: name,
--    surname, phone and sex. Everything else is optional and can be filled
--    in later on the file. Gmail and "Applicant from" become optional.
--    - Passport and Carta d'Identità share one field (passport_number).
--    - File opening charge is a percentage, 0–100. Nothing is paid in-app.
--    - Pre-enrolment summary is a status: Not started / Submitted / Approved.
--    - Visa file submitted (Yes/No) and visa status (Approved/Rejected) are
--      only recorded once a visa appointment date is set.
--    - Sponsorship is Self or Sponsor; a sponsor needs a name and relationship.
-- create_student() is replaced. Apply right before deploying the app code.
begin;

alter table public.students
  add column gender text check (gender in ('male', 'female', 'other')),
  add column agency_email text not null default '' check (length(agency_email) <= 320),
  add column file_opening_charge_percent numeric(5,2) check (file_opening_charge_percent between 0 and 100),
  add column passport_number text not null default '' check (length(passport_number) <= 60),
  add column referral text not null default '' check (length(referral) <= 200),
  add column intake_session text not null default '' check (length(intake_session) <= 60),
  add column program text check (program in ('bachelor', 'master')),
  add column pre_enrollment_status text check (pre_enrollment_status in ('not_started', 'submitted', 'approved')),
  add column visa_appointment_date date,
  add column visa_file_submitted boolean,
  add column visa_status text check (visa_status in ('approved', 'rejected')),
  add column visa_country text not null default '' check (length(visa_country) <= 100),
  add column date_of_birth date,
  add column birth_place text not null default '' check (length(birth_place) <= 200),
  add column tax_code text not null default '' check (length(tax_code) <= 40),
  add column father_name text not null default '' check (length(father_name) <= 200),
  add column mother_name text not null default '' check (length(mother_name) <= 200),
  add column permanent_address text not null default '' check (length(permanent_address) <= 500),
  add column present_address text not null default '' check (length(present_address) <= 500),
  add column sponsorship text check (sponsorship in ('self', 'sponsor')),
  add column sponsor_name text not null default '' check (length(sponsor_name) <= 200),
  add column sponsor_relationship text not null default '' check (length(sponsor_relationship) <= 200),
  add check (visa_appointment_date is not null or (visa_file_submitted is null and visa_status is null)),
  add check (sponsorship = 'sponsor' or (sponsor_name = '' and sponsor_relationship = '')),
  add check (sponsorship is distinct from 'sponsor' or (btrim(sponsor_name) <> '' and btrim(sponsor_relationship) <> ''));

grant update (gender, agency_email, file_opening_charge_percent, passport_number, referral, intake_session,
  program, pre_enrollment_status, visa_appointment_date, visa_file_submitted, visa_status, visa_country,
  date_of_birth, birth_place, tax_code, father_name, mother_name, permanent_address, present_address,
  sponsorship, sponsor_name, sponsor_relationship) on public.students to authenticated;

drop function public.create_student(text, text, text, text, date, text, text, uuid[]);

-- p_details carries the optional fields, keyed by column name. Unknown keys are ignored.
-- Staff: p_file_opened_at, p_drive_link and p_worker_ids are ignored — the file
-- is dated today, has no Drive link and is assigned to the caller.
create function public.create_student(p_first_name text, p_surname text, p_phone text, p_gender text,
  p_file_opened_at date, p_applicant_type text, p_drive_link text, p_worker_ids uuid[], p_details jsonb)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  student_id uuid;
  caller_role public.user_role := public.current_user_role();
  d jsonb := coalesce(p_details, '{}');
begin
  if caller_role is null or caller_role not in ('admin', 'superadmin', 'staff') then
    raise exception 'Only an admin or an active staff member can open a student file.' using errcode = '42501';
  end if;
  if length(btrim(coalesce(p_first_name, ''))) not between 1 and 100 then raise exception 'Enter the name.'; end if;
  if length(btrim(coalesce(p_surname, ''))) not between 1 and 100 then raise exception 'Enter the surname.'; end if;
  if length(btrim(coalesce(p_phone, ''))) not between 1 and 80 then raise exception 'Enter the phone number.'; end if;
  if p_gender is null or p_gender not in ('male', 'female', 'other') then raise exception 'Choose the student''s sex.'; end if;
  if p_applicant_type is not null and p_applicant_type not in ('eu_equivalent', 'international') then
    raise exception 'Choose whether the applicant is EU equivalent or international.';
  end if;
  insert into public.students(first_name, surname, full_name, phone, gender, file_opened_at, applicant_type, drive_link, created_by,
    email, agency_email, file_opening_charge_percent, passport_number, referral, intake_session, program, pre_enrollment_status,
    visa_appointment_date, visa_file_submitted, visa_status, visa_country, date_of_birth, birth_place, tax_code,
    father_name, mother_name, permanent_address, present_address, sponsorship, sponsor_name, sponsor_relationship)
  values (p_first_name, p_surname, '', btrim(p_phone), p_gender,
    case when caller_role = 'staff' then current_date else p_file_opened_at end, p_applicant_type,
    case when caller_role = 'staff' then null else nullif(btrim(coalesce(p_drive_link, '')), '') end, auth.uid(),
    btrim(coalesce(d->>'email', '')), btrim(coalesce(d->>'agency_email', '')), (d->>'file_opening_charge_percent')::numeric,
    btrim(coalesce(d->>'passport_number', '')), btrim(coalesce(d->>'referral', '')), btrim(coalesce(d->>'intake_session', '')),
    d->>'program', d->>'pre_enrollment_status', (d->>'visa_appointment_date')::date, (d->>'visa_file_submitted')::boolean,
    d->>'visa_status', btrim(coalesce(d->>'visa_country', '')), (d->>'date_of_birth')::date, btrim(coalesce(d->>'birth_place', '')),
    btrim(coalesce(d->>'tax_code', '')), btrim(coalesce(d->>'father_name', '')), btrim(coalesce(d->>'mother_name', '')),
    btrim(coalesce(d->>'permanent_address', '')), btrim(coalesce(d->>'present_address', '')), d->>'sponsorship',
    btrim(coalesce(d->>'sponsor_name', '')), btrim(coalesce(d->>'sponsor_relationship', '')))
  returning id into student_id;
  if caller_role = 'staff' then
    -- set_student_workers() is admin-only; a staff member is assigned to the file they open, and to nothing else.
    insert into public.student_staff_assignments(student_id, worker_id, assigned_by) values (student_id, auth.uid(), auth.uid());
  else
    perform public.set_student_workers(student_id, coalesce(p_worker_ids, '{}'));
  end if;
  return student_id;
end;
$$;

revoke all on function public.create_student(text, text, text, text, date, text, text, uuid[], jsonb) from public, anon;
grant execute on function public.create_student(text, text, text, text, date, text, text, uuid[], jsonb) to authenticated;
commit;
