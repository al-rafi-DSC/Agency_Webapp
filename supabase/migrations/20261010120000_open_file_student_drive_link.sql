-- Owner request, 2026-10-07: staff paste the Student Drive Link while opening
-- a student file, not only afterwards on the file. create_student() reads it
-- from p_details ('student_drive_link'); the column's CHECK keeps it HTTPS.
-- Same signature, so the replaced function keeps its grants and the previous
-- app code (which never sends the key) keeps working.
-- Apply before deploying the app code that sends it.
begin;

create or replace function public.create_student(p_first_name text, p_surname text, p_phone text, p_gender text,
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
    father_name, mother_name, permanent_address, present_address, sponsorship, sponsor_name, sponsor_relationship,
    student_drive_link)
  values (p_first_name, p_surname, '', btrim(p_phone), p_gender,
    case when caller_role = 'staff' then current_date else p_file_opened_at end, p_applicant_type,
    case when caller_role = 'staff' then null else nullif(btrim(coalesce(p_drive_link, '')), '') end, auth.uid(),
    btrim(coalesce(d->>'email', '')), btrim(coalesce(d->>'agency_email', '')), (d->>'file_opening_charge_percent')::numeric,
    btrim(coalesce(d->>'passport_number', '')), btrim(coalesce(d->>'referral', '')), btrim(coalesce(d->>'intake_session', '')),
    d->>'program', d->>'pre_enrollment_status', (d->>'visa_appointment_date')::date, (d->>'visa_file_submitted')::boolean,
    d->>'visa_status', btrim(coalesce(d->>'visa_country', '')), (d->>'date_of_birth')::date, btrim(coalesce(d->>'birth_place', '')),
    btrim(coalesce(d->>'tax_code', '')), btrim(coalesce(d->>'father_name', '')), btrim(coalesce(d->>'mother_name', '')),
    btrim(coalesce(d->>'permanent_address', '')), btrim(coalesce(d->>'present_address', '')), d->>'sponsorship',
    btrim(coalesce(d->>'sponsor_name', '')), btrim(coalesce(d->>'sponsor_relationship', '')),
    nullif(btrim(coalesce(d->>'student_drive_link', '')), ''))
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

commit;
